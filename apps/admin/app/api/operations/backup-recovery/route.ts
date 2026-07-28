import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import {
  getBackupRecoverySnapshot,
  runRestoreWorkflow,
  triggerManualBackup
} from "@/lib/backup-recovery/operations";
import { canPerformAction } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/observability/audit-stream";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("trigger_backup")
  }),
  z.object({
    action: z.literal("run_restore"),
    backupId: z.string().min(1),
    confirmationText: z.string().min(1),
    dryRun: z.boolean(),
    kind: z.enum(["DRILL", "INCIDENT"]),
    reason: z.string().min(1)
  })
]);

function getSessionUser(req: NextRequest) {
  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  return parseSessionPayload(rawSession)?.user ?? null;
}

function toAuditStatus(status: "SUCCESS" | "WARNING" | "FAILED") {
  if (status === "FAILED") {
    return "failure" as const;
  }
  if (status === "WARNING") {
    return "warning" as const;
  }
  return "success" as const;
}

function auditContext(req: NextRequest, user: NonNullable<ReturnType<typeof getSessionUser>>) {
  return {
    id: user.id,
    role: user.role,
    name: user.fullName,
    ipAddress: req.headers.get("x-forwarded-for")
  };
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(user.role, "backup_recovery", "view")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, snapshot: getBackupRecoverySnapshot() });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid backup recovery payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.action === "trigger_backup") {
    if (!canPerformAction(user.role, "backup_recovery", "create")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const result = triggerManualBackup({
      id: user.id,
      name: user.fullName,
      role: user.role
    });

    logAuditEvent({
      actor: auditContext(req, user),
      action: "backup_recovery.backup_triggered",
      entity: "BackupSnapshot",
      entityId: result.entry.id,
      module: "operations",
      status: toAuditStatus(result.entry.status),
      metadata: {
        trigger: result.entry.trigger,
        scope: result.entry.scope,
        artifactLabel: result.entry.artifactLabel,
        exportVerified: result.entry.exportVerified
      }
    });

    return NextResponse.json({ success: true, snapshot: result.snapshot });
  }

  if (!canPerformAction(user.role, "backup_recovery", "override")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  logAuditEvent({
    actor: auditContext(req, user),
    action: "backup_recovery.restore_requested",
    entity: "BackupSnapshot",
    entityId: parsed.data.backupId,
    module: "operations",
    status: "warning",
    metadata: {
      dryRun: parsed.data.dryRun,
      kind: parsed.data.kind,
      reason: parsed.data.reason
    }
  });

  const result = runRestoreWorkflow(
    {
      id: user.id,
      name: user.fullName,
      role: user.role
    },
    {
      backupId: parsed.data.backupId,
      confirmationText: parsed.data.confirmationText,
      dryRun: parsed.data.dryRun,
      kind: parsed.data.kind,
      reason: parsed.data.reason
    }
  );

  logAuditEvent({
    actor: auditContext(req, user),
    action: "backup_recovery.restore_completed",
    entity: "RestoreWorkflow",
    entityId: result.attempt.id,
    module: "operations",
    status: toAuditStatus(result.attempt.status),
    metadata: {
      backupId: result.attempt.backupId,
      mode: result.attempt.mode,
      kind: result.attempt.kind,
      outcome: result.attempt.outcome,
      expectedConfirmation: result.expectedPhrase
    }
  });

  if (result.attempt.status === "FAILED") {
    return NextResponse.json(
      { success: false, error: result.attempt.outcome, snapshot: result.snapshot },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, snapshot: result.snapshot });
}

import type { AppRole } from "@/lib/rbac/roles";

export type BackupHistoryStatus = "SUCCESS" | "WARNING" | "FAILED";
export type RestoreExecutionMode = "DRY_RUN" | "SANDBOX_RESTORE";
export type RestoreAttemptStatus = "SUCCESS" | "WARNING" | "FAILED";
export type RestoreAttemptKind = "DRILL" | "INCIDENT";
export type ReadinessStatus = "READY" | "WARNING" | "ACTION_REQUIRED";

export type BackupHistoryEntry = {
  id: string;
  startedAt: string;
  completedAt: string;
  status: BackupHistoryStatus;
  trigger: "AUTOMATED" | "MANUAL";
  initiatedBy: string;
  initiatorRole: AppRole | "SYSTEM";
  scope: string;
  artifactLabel: string;
  exportVerified: boolean;
  notes: string;
};

export type RestoreAttempt = {
  id: string;
  backupId: string;
  requestedAt: string;
  requestedBy: string;
  requesterRole: AppRole;
  mode: RestoreExecutionMode;
  kind: RestoreAttemptKind;
  status: RestoreAttemptStatus;
  outcome: string;
  reason: string;
};

export type RecoveryReadinessCheck = {
  id: string;
  label: string;
  detail: string;
  status: ReadinessStatus;
  lastCheckedAt: string;
};

export type BackupRecoveryOverview = {
  cadence: string;
  nextScheduledBackupAt: string;
  lastBackupAt: string | null;
  latestBackupStatus: BackupHistoryStatus | null;
  latestBackupInitiator: string | null;
  lastSuccessfulRestoreDrillAt: string | null;
  exportVerificationStatus: ReadinessStatus;
  recoveryReadinessStatus: ReadinessStatus;
  storageTarget: string;
  recoveryPointObjective: string;
  recoveryTimeObjective: string;
};

export type BackupRecoverySnapshot = {
  overview: BackupRecoveryOverview;
  history: BackupHistoryEntry[];
  restoreAttempts: RestoreAttempt[];
  readinessChecks: RecoveryReadinessCheck[];
};

type Actor = {
  id: string;
  name: string;
  role: AppRole;
};

type RestoreRequestInput = {
  backupId: string;
  confirmationText: string;
  dryRun: boolean;
  kind: RestoreAttemptKind;
  reason: string;
};

const STORAGE_TARGET = "Encrypted off-site object store + local checksum manifest";
const BACKUP_CADENCE = "Nightly at 02:00 EAT, weekly immutable export every Saturday";
const RECOVERY_POINT_OBJECTIVE = "24 hours";
const RECOVERY_TIME_OBJECTIVE = "4 hours";
const CONFIRMATION_PREFIX = "RESTORE";
const DRY_RUN_PREFIX = "DRY-RUN";

let backupHistory: BackupHistoryEntry[] = [
  {
    id: "backup-2026-07-28-0200",
    startedAt: "2026-07-28T02:00:00.000Z",
    completedAt: "2026-07-28T02:07:00.000Z",
    status: "SUCCESS",
    trigger: "AUTOMATED",
    initiatedBy: "Nightly scheduler",
    initiatorRole: "SYSTEM",
    scope: "Admin operational datasets, Prisma metadata, and audit export bundle",
    artifactLabel: "ops-snapshot-2026-07-28-0200.tar.gz",
    exportVerified: true,
    notes: "Immutable export and checksum manifest uploaded successfully."
  },
  {
    id: "backup-2026-07-27-0200",
    startedAt: "2026-07-27T02:00:00.000Z",
    completedAt: "2026-07-27T02:06:00.000Z",
    status: "SUCCESS",
    trigger: "AUTOMATED",
    initiatedBy: "Nightly scheduler",
    initiatorRole: "SYSTEM",
    scope: "Admin operational datasets, Prisma metadata, and audit export bundle",
    artifactLabel: "ops-snapshot-2026-07-27-0200.tar.gz",
    exportVerified: true,
    notes: "Export manifest validated before retention rotation."
  },
  {
    id: "backup-2026-07-26-1630",
    startedAt: "2026-07-26T16:30:00.000Z",
    completedAt: "2026-07-26T16:37:00.000Z",
    status: "WARNING",
    trigger: "MANUAL",
    initiatedBy: "System Administrator",
    initiatorRole: "SUPER_ADMIN",
    scope: "Pre-release backup rehearsal for admin integrations",
    artifactLabel: "ops-snapshot-2026-07-26-1630.tar.gz",
    exportVerified: true,
    notes: "Completed with delayed off-site replication confirmation."
  }
];

let restoreAttempts: RestoreAttempt[] = [
  {
    id: "restore-2026-07-25-0600",
    backupId: "backup-2026-07-27-0200",
    requestedAt: "2026-07-25T06:00:00.000Z",
    requestedBy: "System Administrator",
    requesterRole: "SUPER_ADMIN",
    mode: "DRY_RUN",
    kind: "DRILL",
    status: "SUCCESS",
    outcome: "Dry run verified backup manifest, checksum chain, and rollback checklist.",
    reason: "Weekly restore drill rehearsal"
  },
  {
    id: "restore-2026-07-18-0615",
    backupId: "backup-2026-07-18-0200",
    requestedAt: "2026-07-18T06:15:00.000Z",
    requestedBy: "System Administrator",
    requesterRole: "SUPER_ADMIN",
    mode: "SANDBOX_RESTORE",
    kind: "DRILL",
    status: "SUCCESS",
    outcome: "Local sandbox replay restored the admin bundle and validated operator checklist timings.",
    reason: "Monthly sandbox recovery verification"
  }
];

let readinessChecks: RecoveryReadinessCheck[] = [
  {
    id: "readiness-export",
    label: "Export verification",
    detail: "Last checksum manifest and archive hash match the retained object-store copy.",
    status: "READY",
    lastCheckedAt: "2026-07-28T02:08:00.000Z"
  },
  {
    id: "readiness-restore-assets",
    label: "Recovery assets prepared",
    detail: "Restore manifest, environment map, and bootstrap scripts are available for operators.",
    status: "READY",
    lastCheckedAt: "2026-07-28T08:20:00.000Z"
  },
  {
    id: "readiness-drill",
    label: "Restore drill recency",
    detail: "Latest successful drill remains within the 14-day rehearsal window.",
    status: "READY",
    lastCheckedAt: "2026-07-28T08:20:00.000Z"
  },
  {
    id: "readiness-contacts",
    label: "Incident contacts and escalation tree",
    detail: "Primary responders, approvers, and communications owners are documented in the runbook.",
    status: "READY",
    lastCheckedAt: "2026-07-28T08:20:00.000Z"
  }
];

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function byNewestTimestamp<T extends { completedAt?: string; requestedAt?: string; lastCheckedAt?: string }>(
  left: T,
  right: T
) {
  const leftTimestamp = left.completedAt ?? left.requestedAt ?? left.lastCheckedAt ?? "";
  const rightTimestamp = right.completedAt ?? right.requestedAt ?? right.lastCheckedAt ?? "";
  return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
}

function deriveReadinessStatus() {
  if (readinessChecks.some(check => check.status === "ACTION_REQUIRED")) {
    return "ACTION_REQUIRED" as const;
  }
  if (readinessChecks.some(check => check.status === "WARNING")) {
    return "WARNING" as const;
  }
  return "READY" as const;
}

function findLastSuccessfulRestoreDrillAt() {
  return (
    [...restoreAttempts]
      .sort(byNewestTimestamp)
      .find(attempt => attempt.kind === "DRILL" && attempt.status === "SUCCESS")?.requestedAt ?? null
  );
}

function updateDerivedChecks() {
  const latestBackup = [...backupHistory].sort(byNewestTimestamp)[0];
  const lastDrillAt = findLastSuccessfulRestoreDrillAt();

  readinessChecks = readinessChecks.map(check => {
    if (check.id === "readiness-export" && latestBackup) {
      return {
        ...check,
        status: latestBackup.exportVerified ? "READY" : "WARNING",
        detail: latestBackup.exportVerified
          ? "Last checksum manifest and archive hash match the retained object-store copy."
          : "Latest export is waiting for verification against retained backup artifacts.",
        lastCheckedAt: latestBackup.completedAt
      };
    }

    if (check.id === "readiness-drill") {
      const lastDrillMillis = lastDrillAt ? new Date(lastDrillAt).getTime() : 0;
      const ageDays = lastDrillMillis
        ? Math.floor((Date.now() - lastDrillMillis) / (24 * 60 * 60 * 1000))
        : Number.POSITIVE_INFINITY;
      const status: ReadinessStatus = ageDays <= 14 ? "READY" : ageDays <= 30 ? "WARNING" : "ACTION_REQUIRED";

      return {
        ...check,
        status,
        detail: lastDrillAt
          ? `Last successful drill completed ${ageDays} day${ageDays === 1 ? "" : "s"} ago.`
          : "No successful restore drill has been recorded yet.",
        lastCheckedAt: lastDrillAt ?? check.lastCheckedAt
      };
    }

    return check;
  });
}

function getOverview(): BackupRecoveryOverview {
  const latestBackup = [...backupHistory].sort(byNewestTimestamp)[0] ?? null;
  updateDerivedChecks();

  return {
    cadence: BACKUP_CADENCE,
    nextScheduledBackupAt: "2026-07-29T02:00:00.000Z",
    lastBackupAt: latestBackup?.completedAt ?? null,
    latestBackupStatus: latestBackup?.status ?? null,
    latestBackupInitiator: latestBackup?.initiatedBy ?? null,
    lastSuccessfulRestoreDrillAt: findLastSuccessfulRestoreDrillAt(),
    exportVerificationStatus: readinessChecks.find(check => check.id === "readiness-export")?.status ?? "READY",
    recoveryReadinessStatus: deriveReadinessStatus(),
    storageTarget: STORAGE_TARGET,
    recoveryPointObjective: RECOVERY_POINT_OBJECTIVE,
    recoveryTimeObjective: RECOVERY_TIME_OBJECTIVE
  };
}

export function getBackupRecoverySnapshot(): BackupRecoverySnapshot {
  return {
    overview: getOverview(),
    history: [...backupHistory].sort(byNewestTimestamp),
    restoreAttempts: [...restoreAttempts].sort(byNewestTimestamp),
    readinessChecks: [...readinessChecks].sort(byNewestTimestamp)
  };
}

export function triggerManualBackup(actor: Actor) {
  const startedAt = new Date().toISOString();
  const completedAt = new Date(Date.now() + 90_000).toISOString();

  const entry: BackupHistoryEntry = {
    id: nextId("backup"),
    startedAt,
    completedAt,
    status: "SUCCESS",
    trigger: "MANUAL",
    initiatedBy: actor.name,
    initiatorRole: actor.role,
    scope: "Admin operational datasets, Prisma metadata, and audit export bundle",
    artifactLabel: `ops-snapshot-${startedAt.slice(0, 16).replace(/[:T]/g, "-")}.tar.gz`,
    exportVerified: true,
    notes:
      "Manual backup completed through the local-safe rehearsal path. No external infrastructure credentials were required."
  };

  backupHistory = [entry, ...backupHistory].sort(byNewestTimestamp);
  updateDerivedChecks();

  return {
    entry,
    snapshot: getBackupRecoverySnapshot()
  };
}

export function runRestoreWorkflow(actor: Actor, input: RestoreRequestInput) {
  const selectedBackup = backupHistory.find(entry => entry.id === input.backupId);
  const expectedPhrase = `${input.dryRun ? DRY_RUN_PREFIX : CONFIRMATION_PREFIX} ${input.backupId}`;
  const normalizedReason = input.reason.trim();

  let status: RestoreAttemptStatus = "SUCCESS";
  let outcome = "";

  if (!selectedBackup) {
    status = "FAILED";
    outcome = "Selected backup artifact could not be found in the recovery ledger.";
  } else if (input.confirmationText.trim() !== expectedPhrase) {
    status = "FAILED";
    outcome = `Confirmation phrase mismatch. Expected "${expectedPhrase}".`;
  } else if (normalizedReason.length < 8) {
    status = "FAILED";
    outcome = "Reason must be descriptive enough for incident and compliance review.";
  } else if (input.dryRun) {
    outcome =
      "Dry run validated manifest integrity, dependency ordering, and rollback checkpoints without applying data.";
  } else {
    status = "SUCCESS";
    outcome =
      "Local sandbox replay completed from the selected backup. Production infrastructure was not touched in this safe mock flow.";
  }

  const attempt: RestoreAttempt = {
    id: nextId("restore"),
    backupId: input.backupId,
    requestedAt: new Date().toISOString(),
    requestedBy: actor.name,
    requesterRole: actor.role,
    mode: input.dryRun ? "DRY_RUN" : "SANDBOX_RESTORE",
    kind: input.kind,
    status,
    outcome,
    reason: normalizedReason
  };

  restoreAttempts = [attempt, ...restoreAttempts].sort(byNewestTimestamp);
  updateDerivedChecks();

  return {
    attempt,
    expectedPhrase,
    snapshot: getBackupRecoverySnapshot()
  };
}

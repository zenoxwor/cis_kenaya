import type { AppRole } from "@/lib/rbac/roles";
import type { AuditLogEntry } from "@/lib/audit/types";
import { mockAuditLogs } from "@/lib/audit/mock-audit-logs";

type AppendAuditLogInput = {
  actorUserId?: string | null;
  actorRole: AppRole;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  campusId?: string;
};

const auditLogStore: AuditLogEntry[] = [...mockAuditLogs];

function nextAuditId() {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listAuditLogs() {
  return [...auditLogStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function appendAuditLog(input: AppendAuditLogInput) {
  const entry: AuditLogEntry = {
    id: nextAuditId(),
    campusId: input.campusId ?? "main-campus",
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ipAddress: input.ipAddress ?? null,
    metadataJson: JSON.stringify(input.metadata ?? {}),
    createdAt: new Date().toISOString()
  };

  auditLogStore.unshift(entry);
  return entry;
}

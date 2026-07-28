import type { AppRole } from "@/lib/rbac/roles";
import type { AuditLogEntry } from "@/lib/audit/types";
import { mockAuditLogs } from "@/lib/audit/mock-audit-logs";
import { initializeAuditStream, listAuditEvents, logAuditEvent } from "@/lib/observability/audit-stream";

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

initializeAuditStream(mockAuditLogs);

function nextAuditId() {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listAuditLogs() {
  return listAuditEvents();
}

export function appendAuditLog(input: AppendAuditLogInput) {
  return logAuditEvent({
    id: nextAuditId(),
    actor: {
      id: input.actorUserId ?? null,
      role: input.actorRole,
      name: null,
      ipAddress: input.ipAddress ?? null
    },
    action: input.action,
    entity: input.resourceType,
    entityId: input.resourceId,
    module: input.campusId ?? "main-campus",
    status: "success",
    metadata: input.metadata ?? {}
  });
}

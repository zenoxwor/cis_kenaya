import type { AppRole } from "@/lib/rbac/roles";

export type AuditLogEntry = {
  id: string;
  campusId: string;
  actorUserId: string | null;
  actorRole: AppRole;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string | null;
  metadataJson: string;
  createdAt: string;
};

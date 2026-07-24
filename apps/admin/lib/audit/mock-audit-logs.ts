import { ROLE } from "@/lib/rbac/roles";
import type { AuditLogEntry } from "@/lib/audit/types";

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "audit-001",
    campusId: "main-campus",
    actorUserId: "mock-super-admin",
    actorRole: ROLE.SUPER_ADMIN,
    action: "override_approve",
    resourceType: "Application",
    resourceId: "APP-20260724-0910-441",
    ipAddress: "10.10.0.31",
    metadataJson: "{\"reason\":\"Manual committee override\"}",
    createdAt: "2026-07-24T09:33:00.000Z"
  },
  {
    id: "audit-002",
    campusId: "main-campus",
    actorUserId: "mock-principal",
    actorRole: ROLE.PRINCIPAL,
    action: "approve_application",
    resourceType: "Application",
    resourceId: "APP-20260723-1645-776",
    ipAddress: "10.10.0.22",
    metadataJson: "{\"decision\":\"approved\"}",
    createdAt: "2026-07-24T08:56:00.000Z"
  },
  {
    id: "audit-003",
    campusId: "main-campus",
    actorUserId: "mock-finance",
    actorRole: ROLE.FINANCE,
    action: "issue_invoice",
    resourceType: "FeeInvoice",
    resourceId: "INV-2026-392",
    ipAddress: "10.10.0.44",
    metadataJson: "{\"amountMinor\":198000}",
    createdAt: "2026-07-24T08:05:00.000Z"
  },
  {
    id: "audit-004",
    campusId: "main-campus",
    actorUserId: "mock-reception",
    actorRole: ROLE.RECEPTION,
    action: "verify_documents",
    resourceType: "StudentDocument",
    resourceId: "doc-001-c",
    ipAddress: "10.10.0.18",
    metadataJson: "{\"verified\":true}",
    createdAt: "2026-07-24T07:52:00.000Z"
  }
];

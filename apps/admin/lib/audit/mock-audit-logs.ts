import type { AuditLogEntry } from "@/lib/audit/types";
import { ROLE } from "@/lib/rbac/roles";
import { initializeAuditStream } from "@/lib/observability/audit-stream";

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "evt_seed_001",
    actor: {
      id: "mock-super-admin",
      role: ROLE.SUPER_ADMIN,
      name: "System Administrator",
      ipAddress: "10.10.0.31"
    },
    action: "workflow.override_approve",
    entity: "Application",
    entityId: "APP-20260724-0910-441",
    module: "admissions",
    status: "success",
    timestamp: "2026-07-24T09:33:00.000Z",
    metadata: {
      reason: "Manual committee override"
    }
  },
  {
    id: "evt_seed_002",
    actor: {
      id: "mock-principal",
      role: ROLE.PRINCIPAL,
      name: "School Principal",
      ipAddress: "10.10.0.22"
    },
    action: "workflow.approve_application",
    entity: "Application",
    entityId: "APP-20260723-1645-776",
    module: "admissions",
    status: "success",
    timestamp: "2026-07-24T08:56:00.000Z",
    metadata: {
      decision: "approved"
    }
  },
  {
    id: "evt_seed_003",
    actor: {
      id: "mock-finance",
      role: ROLE.FINANCE,
      name: "Finance Officer",
      ipAddress: "10.10.0.44"
    },
    action: "finance.issue_invoice",
    entity: "FeeInvoice",
    entityId: "INV-2026-392",
    module: "finance",
    status: "success",
    timestamp: "2026-07-24T08:05:00.000Z",
    metadata: {
      amountMinor: 198000
    }
  },
  {
    id: "evt_seed_004",
    actor: {
      id: "mock-reception",
      role: ROLE.RECEPTION,
      name: "Admissions Officer",
      ipAddress: "10.10.0.18"
    },
    action: "documents.verify",
    entity: "StudentDocument",
    entityId: "doc-001-c",
    module: "admissions",
    status: "success",
    timestamp: "2026-07-24T07:52:00.000Z",
    metadata: {
      verified: true
    }
  }
];

initializeAuditStream(mockAuditLogs);

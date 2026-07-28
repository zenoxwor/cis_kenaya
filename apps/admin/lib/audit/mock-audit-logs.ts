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
  },
  {
    id: "evt_seed_005",
    actor: {
      id: "mock-super-admin",
      role: ROLE.SUPER_ADMIN,
      name: "System Administrator",
      ipAddress: "10.10.0.31"
    },
    action: "backup_recovery.backup_triggered",
    entity: "BackupSnapshot",
    entityId: "backup-2026-07-28-0200",
    module: "operations",
    status: "success",
    timestamp: "2026-07-28T02:07:00.000Z",
    metadata: {
      trigger: "AUTOMATED",
      exportVerified: true
    }
  },
  {
    id: "evt_seed_006",
    actor: {
      id: "mock-super-admin",
      role: ROLE.SUPER_ADMIN,
      name: "System Administrator",
      ipAddress: "10.10.0.31"
    },
    action: "backup_recovery.restore_completed",
    entity: "RestoreWorkflow",
    entityId: "restore-2026-07-25-0600",
    module: "operations",
    status: "success",
    timestamp: "2026-07-25T06:08:00.000Z",
    metadata: {
      mode: "DRY_RUN",
      kind: "DRILL",
      backupId: "backup-2026-07-27-0200"
    }
  }
];

initializeAuditStream(mockAuditLogs);

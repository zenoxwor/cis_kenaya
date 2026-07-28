import { AuditLogConsole } from "@/components/audit/audit-log-console";
import { mockAuditLogs } from "@/lib/audit/mock-audit-logs";

export default function SuperAdminAuditPage() {
  return <AuditLogConsole entries={mockAuditLogs} />;
}

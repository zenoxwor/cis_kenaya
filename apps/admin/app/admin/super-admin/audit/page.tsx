import { AuditLogConsole } from "@/components/audit/audit-log-console";
import "@/lib/audit/mock-audit-logs";
import { getOperationsHealthData, listAuditEvents } from "@/lib/observability/audit-stream";

export default function SuperAdminAuditPage() {
  return <AuditLogConsole entries={listAuditEvents()} health={getOperationsHealthData()} />;
}

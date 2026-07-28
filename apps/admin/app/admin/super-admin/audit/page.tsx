import { AuditLogConsole } from "@/components/audit/audit-log-console";
import { listAuditLogs } from "@/lib/audit/repository";

export default function SuperAdminAuditPage() {
  return <AuditLogConsole entries={listAuditLogs()} />;
}

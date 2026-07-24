import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";

export default function FinancePaymentsPage() {
  return (
    <RoleWorkflowBoard
      role={ROLE.FINANCE}
      heading="Finance Payment Workflow"
      subtitle="Settlement tracking and lifecycle updates for issued enrollment invoices."
    />
  );
}

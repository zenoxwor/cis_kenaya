import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";

export default function FinanceInvoicesPage() {
  return (
    <RoleWorkflowBoard
      role={ROLE.FINANCE}
      heading="Finance Invoice Workflow"
      subtitle="Invoice issuance and payment-state transitions tied to approved applications."
    />
  );
}

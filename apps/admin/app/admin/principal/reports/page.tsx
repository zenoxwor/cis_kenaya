import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";

export default function PrincipalReportsPage() {
  return (
    <RoleWorkflowBoard
      role={ROLE.PRINCIPAL}
      heading="Principal Decision Workflow"
      subtitle="Application review, interview scheduling, approvals, waitlisting, and conversion oversight."
    />
  );
}

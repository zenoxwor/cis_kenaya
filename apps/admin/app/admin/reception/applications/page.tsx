import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";

export default function ReceptionApplicationsPage() {
  return (
    <RoleWorkflowBoard
      role={ROLE.RECEPTION}
      heading="Admissions Workflow Queue"
      subtitle="Reception-driven intake actions across submission, documentation, and review routing."
    />
  );
}

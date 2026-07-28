import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";
import Link from "next/link";

export default function PrincipalReportsPage() {
  return (
    <section className="space-y-4">
      <div className="admin-content-card">
        <p className="text-sm text-slate-600">
          Need aggregate trends?{" "}
          <Link href="/admin/principal/analytics">Open principal analytics report pack →</Link>
        </p>
      </div>
      <RoleWorkflowBoard
        role={ROLE.PRINCIPAL}
        heading="Principal Decision Workflow"
        subtitle="Application review, interview scheduling, approvals, waitlisting, and conversion oversight."
      />
    </section>
  );
}

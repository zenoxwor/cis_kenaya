import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";
import Link from "next/link";

export default function ReceptionApplicationsPage() {
  return (
    <section className="space-y-4">
      <div className="admin-content-card">
        <p className="text-sm text-slate-600">
          Need intake trends? <Link href="/admin/reception/analytics">Open reception analytics pack →</Link>
        </p>
      </div>
      <RoleWorkflowBoard
        role={ROLE.RECEPTION}
        heading="Admissions Workflow Queue"
        subtitle="Reception-driven intake actions across submission, documentation, and review routing."
      />
    </section>
  );
}

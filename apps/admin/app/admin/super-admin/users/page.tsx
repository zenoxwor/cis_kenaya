import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";
import Link from "next/link";

export default function SuperAdminUsersPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">User & Role Governance</h1>
        <p className="mt-2 text-slate-600">
          Access governance workspace plus workflow override controls for escalated cases.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/super-admin/audit">Open audit console →</Link>
          <Link href="/admin/super-admin/settings">Open oversight settings →</Link>
        </div>
      </header>
      <RoleWorkflowBoard
        role={ROLE.SUPER_ADMIN}
        heading="Super Admin Workflow Overrides"
        subtitle="Escalated application, document, and enrollment actions requiring governance authority."
      />
    </section>
  );
}

import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";
import Link from "next/link";

export default function FinancePaymentsPage() {
  return (
    <section className="space-y-4">
      <div className="admin-content-card">
        <p className="text-sm text-slate-600">
          Need reporting pack? <Link href="/admin/finance/reports">Open finance reporting view →</Link>
        </p>
      </div>
      <RoleWorkflowBoard
        role={ROLE.FINANCE}
        heading="Finance Payment Workflow"
        subtitle="Settlement tracking and lifecycle updates for issued enrollment invoices."
      />
    </section>
  );
}

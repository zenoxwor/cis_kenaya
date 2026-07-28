import { RoleWorkflowBoard } from "@/components/workflow/role-workflow-board";
import { ROLE } from "@/lib/rbac/roles";
import Link from "next/link";

export default function FinanceInvoicesPage() {
  return (
    <section className="space-y-4">
      <div className="admin-content-card">
        <p className="text-sm text-slate-600">
          Need reporting pack? <Link href="/admin/finance/reports">Open finance reporting view →</Link>
        </p>
      </div>
      <RoleWorkflowBoard
        role={ROLE.FINANCE}
        heading="Finance Invoice Workflow"
        subtitle="Invoice issuance and payment-state transitions tied to approved applications."
      />
    </section>
  );
}

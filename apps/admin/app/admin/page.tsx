import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { canAccessRoute } from "@/lib/rbac/permissions";
import { ROLE, ROLE_LABELS, type AppRole } from "@/lib/rbac/roles";

const roleDashboards = [
  {
    role: ROLE.SUPER_ADMIN,
    label: "Super Admin",
    href: "/admin/super-admin",
    description: "Platform control, identity governance, and global settings."
  },
  {
    role: ROLE.PRINCIPAL,
    label: "Principal",
    href: "/admin/principal",
    description: "School-level oversight, key reports, and performance views."
  },
  {
    role: ROLE.RECEPTION,
    label: "Reception / Admissions",
    href: "/admin/reception",
    description: "Inquiry handling, applicant triage, and registration operations."
  },
  {
    role: ROLE.FINANCE,
    label: "Finance",
    href: "/admin/finance",
    description: "Billing workflows, financial statements, and receivables control."
  }
] as const satisfies ReadonlyArray<{
  role: AppRole;
  label: string;
  href: string;
  description: string;
}>;

export default async function AdminDashboardPage() {
  const user = await requireCurrentUser("/admin");
  const visibleCards = roleDashboards.filter(item => canAccessRoute(user.role, item.href));

  return (
    <section className="space-y-6">
      <div className="admin-content-card">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          Dashboard Overview
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Welcome, {user.fullName}</h1>
        <p className="mt-2 text-slate-600">
          Active role: <span className="font-medium">{ROLE_LABELS[user.role]}</span>. This foundation is
          ready for module expansion while preserving the public website separately.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleCards.map(item => (
          <article key={item.role} className="admin-content-card">
            <h2 className="text-lg font-semibold text-slate-900">{item.label}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            <Link className="mt-4 inline-flex text-sm font-semibold" href={item.href}>
              Open placeholder →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

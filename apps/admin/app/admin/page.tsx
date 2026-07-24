import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/rbac/roles";

const roleDashboards = [
  {
    role: "super_admin",
    label: "Super Admin",
    href: "/admin/super-admin",
    description: "Platform control, identity governance, and global settings."
  },
  {
    role: "principal",
    label: "Principal",
    href: "/admin/principal",
    description: "School-level oversight, key reports, and performance views."
  },
  {
    role: "reception_admissions",
    label: "Reception / Admissions",
    href: "/admin/admissions",
    description: "Inquiry handling, applicant triage, and registration operations."
  },
  {
    role: "finance",
    label: "Finance",
    href: "/admin/finance",
    description: "Billing workflows, financial statements, and receivables control."
  }
] as const;

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

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
        {roleDashboards.map(item => (
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

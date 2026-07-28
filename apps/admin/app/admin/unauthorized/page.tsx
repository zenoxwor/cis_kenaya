import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="admin-content-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Access denied</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">You do not have permission for this area</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your authenticated role is valid, but this route is restricted by RBAC policy.
        </p>
        <div className="mt-4 space-x-4 text-sm">
          <Link href="/admin">Go to dashboard</Link>
          <Link href="/sign-in">Switch account</Link>
        </div>
      </div>
    </section>
  );
}

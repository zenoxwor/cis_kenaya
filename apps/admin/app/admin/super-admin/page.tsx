import Link from "next/link";

const modules = [
  "Identity and access administration",
  "Role assignment workflow",
  "Audit log review",
  "System-wide settings"
];

export default function SuperAdminPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Console</h1>
        <p className="mt-2 text-slate-600">
          Foundation area for global ownership of school operations and security controls.
        </p>
      </header>
      <div className="admin-content-card">
        <h2 className="text-lg font-semibold">Planned modules</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {modules.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
        <Link className="mt-4 inline-flex text-sm font-semibold" href="/admin/super-admin/users">
          Open user governance section →
        </Link>
      </div>
    </section>
  );
}

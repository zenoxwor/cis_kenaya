const reportPanels = [
  "Enrollment trend snapshots",
  "Application approval funnel",
  "Document verification completion rate",
  "Fee collection and balance summary"
];

export default function PrincipalReportsPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Principal Reports</h1>
        <p className="mt-2 text-slate-600">
          Leadership reporting surface for school-level decisions and approvals.
        </p>
      </header>
      <div className="admin-content-card">
        <ul className="space-y-2 text-sm text-slate-700">
          {reportPanels.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

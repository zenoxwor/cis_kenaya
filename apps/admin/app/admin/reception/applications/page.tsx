const queue = [
  "New applicants awaiting intake review",
  "Applications awaiting principal approval",
  "Applications waiting for missing documents"
];

export default function ReceptionApplicationsPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Applications Queue</h1>
        <p className="mt-2 text-slate-600">
          Placeholder queue for intake review and admission progression.
        </p>
      </header>
      <div className="admin-content-card">
        <ul className="space-y-2 text-sm text-slate-700">
          {queue.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

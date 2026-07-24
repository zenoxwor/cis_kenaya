const admissionsStates = [
  "New inquiry",
  "Documents requested",
  "Interview scheduled",
  "Committee decision pending",
  "Accepted / rejected"
];

export default function AdmissionsPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Reception & Admissions</h1>
        <p className="mt-2 text-slate-600">
          Applicant workflow placeholder with direct path to the 6-step registration wizard.
        </p>
      </header>

      <div className="admin-content-card">
        <h2 className="text-lg font-semibold">Application pipeline statuses</h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {admissionsStates.map(state => (
            <li key={state}>• {state}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

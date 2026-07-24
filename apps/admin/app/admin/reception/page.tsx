import Link from "next/link";

const admissionsStates = [
  "New inquiry",
  "Documents requested",
  "Interview scheduled",
  "Committee decision pending",
  "Accepted / rejected"
];

export default function ReceptionPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Reception & Admissions</h1>
        <p className="mt-2 text-slate-600">
          Front-office admissions workspace with direct access to application queue and registration
          wizard.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="admin-content-card">
          <h2 className="text-lg font-semibold">Application pipeline statuses</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {admissionsStates.map(state => (
              <li key={state}>• {state}</li>
            ))}
          </ul>
        </article>
        <article className="admin-content-card">
          <h2 className="text-lg font-semibold">Admissions quick links</h2>
          <div className="mt-3 space-y-2 text-sm">
            <Link className="block" href="/admin/reception/applications">
              Open applications queue →
            </Link>
            <Link className="block" href="/admin/registration">
              Open 6-step registration wizard →
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

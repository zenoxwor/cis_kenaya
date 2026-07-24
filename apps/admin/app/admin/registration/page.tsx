const wizardSteps = [
  "Student profile and identity",
  "Guardian and emergency contacts",
  "Academic history and placement",
  "Medical and special support needs",
  "Documents upload and verification",
  "Review, consent, and final submission"
];

export default function RegistrationPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Registration Wizard Blueprint</h1>
        <p className="mt-2 text-slate-600">
          This route reserves the in-app 6-step student registration experience required for future
          admissions operations.
        </p>
      </header>

      <div className="admin-content-card">
        <h2 className="text-lg font-semibold">Planned step flow</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          {wizardSteps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

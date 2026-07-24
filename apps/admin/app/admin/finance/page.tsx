const financeWidgets = [
  "Outstanding invoices",
  "Tuition collections by cycle",
  "Fee structure catalog",
  "Posting and reconciliation status"
];

export default function FinancePage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Finance Operations</h1>
        <p className="mt-2 text-slate-600">
          Foundation module for receivables, payments, and financial reporting workflows.
        </p>
      </header>
      <div className="admin-content-card">
        <h2 className="text-lg font-semibold">Phase 1 placeholders</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {financeWidgets.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const paymentViews = [
  "Pending payment entries",
  "Successful payment postings",
  "Failed/reversed transactions",
  "Export-ready reconciliation batches"
];

export default function FinancePaymentsPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Payment Operations</h1>
        <p className="mt-2 text-slate-600">
          Placeholder workflow for recording and reconciling fee payments.
        </p>
      </header>
      <div className="admin-content-card">
        <ul className="space-y-2 text-sm text-slate-700">
          {paymentViews.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

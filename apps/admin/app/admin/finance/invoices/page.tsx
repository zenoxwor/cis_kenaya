const invoiceViews = [
  "Due invoices",
  "Overdue invoices",
  "Partially paid invoices",
  "Waiver and override requests"
];

export default function FinanceInvoicesPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Invoice Management</h1>
        <p className="mt-2 text-slate-600">
          Placeholder workspace for issuing, editing, and approving fee invoices.
        </p>
      </header>
      <div className="admin-content-card">
        <ul className="space-y-2 text-sm text-slate-700">
          {invoiceViews.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

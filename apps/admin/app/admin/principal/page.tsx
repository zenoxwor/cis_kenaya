import Link from "next/link";

const cards = [
  { title: "School Performance", copy: "Attendance, behavior, and progression trend placeholders." },
  { title: "Approvals Queue", copy: "Pending admissions and policy approvals to review." },
  { title: "Operational Alerts", copy: "Cross-department updates and escalations." }
];

export default function PrincipalPage() {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Principal Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Executive school insights for the single main campus in Phase 1.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(card => (
          <article key={card.title} className="admin-content-card">
            <h2 className="text-base font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.copy}</p>
          </article>
        ))}
      </div>
      <div className="admin-content-card">
        <Link className="inline-flex text-sm font-semibold" href="/admin/principal/reports">
          Open principal reports section →
        </Link>
      </div>
    </section>
  );
}

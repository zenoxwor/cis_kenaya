import Link from "next/link";
import type { RoleDashboardData } from "@/lib/dashboard/types";

type RoleDashboardProps = {
  data: RoleDashboardData;
};

export function RoleDashboard({ data }: RoleDashboardProps) {
  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">{data.heading}</h1>
        <p className="mt-2 text-slate-600">{data.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.kpis.map(kpi => (
          <article key={kpi.label} className="admin-content-card">
            <p className="text-sm text-slate-600">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{kpi.value}</p>
            <p
              className={[
                "mt-1 text-xs font-semibold",
                kpi.tone === "positive"
                  ? "text-emerald-700"
                  : kpi.tone === "warning"
                    ? "text-amber-700"
                    : "text-slate-500"
              ].join(" ")}
            >
              {kpi.trend}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="admin-content-card lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          <div className="mt-3 space-y-3">
            {data.recentActivity.map(item => (
              <div
                key={`${item.when}-${item.title}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <span className="text-xs font-medium text-slate-500">{item.when}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-content-card">
          <h2 className="text-lg font-semibold text-slate-900">Action shortcuts</h2>
          <div className="mt-3 space-y-3">
            {data.shortcuts.map(shortcut => (
              <Link
                key={shortcut.href}
                className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                href={shortcut.href}
              >
                <p className="text-sm font-semibold text-slate-900">{shortcut.label}</p>
                <p className="text-xs text-slate-600">{shortcut.hint}</p>
              </Link>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {data.tables.map(table => (
          <article key={table.title} className="admin-content-card">
            <h2 className="text-lg font-semibold text-slate-900">{table.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{table.caption}</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {table.columns.map(column => (
                      <th key={column} className="px-3 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${table.title}-${rowIndex}`} className="border-t border-slate-100">
                      {row.map((cell, cellIndex) => (
                        <td key={`${table.title}-${rowIndex}-${cellIndex}`} className="px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

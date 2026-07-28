"use client";

import { useState } from "react";
import type { ReportSurfaceData } from "@/lib/reporting/types";

type ReportSurfaceProps = {
  data: ReportSurfaceData;
  exportKey: string;
};

export function ReportSurface({ data, exportKey }: ReportSurfaceProps) {
  const [notice, setNotice] = useState<string | null>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportKey}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const chunks = data.tables.map(table => {
      const header = table.columns.join(",");
      const rows = table.rows.map(row =>
        row.map(cell => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")
      );
      return [`# ${table.title}`, header, ...rows, ""].join("\n");
    });

    const blob = new Blob([chunks.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportKey}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const response = await fetch("/api/reports/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exportKey,
        heading: data.heading
      })
    });

    if (!response.ok) {
      setNotice("PDF export endpoint is a placeholder. Wire a server PDF renderer in production.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportKey}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.heading}</h1>
            <p className="mt-2 text-slate-600">{data.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={exportJson}
              type="button"
            >
              Export JSON
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={exportCsv}
              type="button"
            >
              Export CSV
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={() => window.print()}
              type="button"
            >
              Print
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={exportPdf}
              type="button"
            >
              Export PDF
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map(metric => (
          <article key={metric.label} className="admin-content-card">
            <p className="text-sm text-slate-600">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
            <p
              className={[
                "mt-1 text-xs font-semibold",
                metric.tone === "positive"
                  ? "text-emerald-700"
                  : metric.tone === "warning"
                    ? "text-amber-700"
                    : "text-slate-500"
              ].join(" ")}
            >
              {metric.delta}
            </p>
          </article>
        ))}
      </div>

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold text-slate-900">Highlights</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {data.highlights.map(item => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </article>

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
                      <th key={column} className="px-3 py-2">
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

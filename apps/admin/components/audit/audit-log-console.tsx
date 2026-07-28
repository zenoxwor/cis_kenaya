"use client";

import { useMemo, useState } from "react";
import type { AuditLogEntry } from "@/lib/audit/types";
import type { OperationsHealthPanelData } from "@/lib/observability/types";

type AuditLogConsoleProps = {
  entries: AuditLogEntry[];
  health: OperationsHealthPanelData;
};

export function AuditLogConsole({ entries, health }: AuditLogConsoleProps) {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    return entries.filter(entry => {
      const moduleMatch = moduleFilter === "all" || entry.module === moduleFilter;
      const statusMatch = statusFilter === "all" || entry.status === statusFilter;
      const actorQuery = actorFilter.trim().toLowerCase();
      const actorMatch =
        actorQuery.length === 0 ||
        (entry.actor.name ?? "").toLowerCase().includes(actorQuery) ||
        (entry.actor.id ?? "").toLowerCase().includes(actorQuery) ||
        (entry.actor.role ?? "").toLowerCase().includes(actorQuery);
      const date = new Date(entry.timestamp).toISOString().slice(0, 10);
      const fromMatch = !dateFrom || date >= dateFrom;
      const toMatch = !dateTo || date <= dateTo;
      const query = searchText.trim().toLowerCase();
      const textMatch =
        query.length === 0 ||
        entry.action.toLowerCase().includes(query) ||
        entry.entityId.toLowerCase().includes(query) ||
        entry.entity.toLowerCase().includes(query);
      return moduleMatch && statusMatch && actorMatch && fromMatch && toMatch && textMatch;
    });
  }, [entries, moduleFilter, statusFilter, actorFilter, dateFrom, dateTo, searchText]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audit-log-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const rows = [
      "timestamp,module,status,actorName,actorId,actorRole,action,entity,entityId,metadata",
      ...filtered.map(entry => {
        const metadata = JSON.stringify(entry.metadata).replace(/"/g, '""');
        return [
          entry.timestamp,
          entry.module,
          entry.status,
          entry.actor.name ?? "",
          entry.actor.id ?? "",
          entry.actor.role ?? "",
          entry.action,
          entry.entity,
          entry.entityId,
          `"${metadata}"`
        ].join(",");
      })
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audit-log-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log Console</h1>
        <p className="mt-2 text-slate-600">
          Structured monitoring stream for authentication, RBAC, data mutations, approvals, and trigger activity.
        </p>
      </header>

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold text-slate-900">Operations health</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HealthCard label="Recent failures (24h)" value={String(health.recentFailures)} />
          <HealthCard label="Retries observed (24h)" value={String(health.recentRetries)} />
          {health.alertStatuses.map(alert => (
            <HealthCard
              key={alert.key}
              label={alert.key}
              value={alert.status === "warning" ? `Warning (${alert.count})` : "OK"}
              note={alert.lastTriggeredAt ?? "No active alerts"}
            />
          ))}
        </div>
      </article>

      <div className="admin-content-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Module</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setModuleFilter(event.target.value)}
              value={moduleFilter}
            >
              <option value="all">All</option>
              {Array.from(new Set(entries.map(entry => entry.module))).map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Status</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="all">All</option>
              {Array.from(new Set(entries.map(entry => entry.status))).map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Actor</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setActorFilter(event.target.value)}
              value={actorFilter}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">From</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">To</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setDateTo(event.target.value)}
              type="date"
              value={dateTo}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Search action/entity</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setSearchText(event.target.value)}
              value={searchText}
            />
          </label>
          <div className="flex gap-2">
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
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{entry.timestamp}</td>
                  <td className="px-3 py-2">
                    {(entry.actor.name ?? entry.actor.id ?? "Unknown actor")}
                    <div className="text-xs text-slate-500">{entry.actor.role ?? "n/a"}</div>
                  </td>
                  <td className="px-3 py-2">{entry.module}</td>
                  <td className="px-3 py-2">{entry.action}</td>
                  <td className="px-3 py-2">
                    {entry.entity} / {entry.entityId}
                  </td>
                  <td className="px-3 py-2">{entry.status}</td>
                  <td className="px-3 py-2">{JSON.stringify(entry.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function HealthCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </article>
  );
}

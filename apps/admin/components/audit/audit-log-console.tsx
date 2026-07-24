"use client";

import { useMemo, useState } from "react";
import type { AuditLogEntry } from "@/lib/audit/types";

type AuditLogConsoleProps = {
  entries: AuditLogEntry[];
};

export function AuditLogConsole({ entries }: AuditLogConsoleProps) {
  const [resourceFilter, setResourceFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(() => {
    return entries.filter(entry => {
      const resourceMatch = resourceFilter === "all" || entry.resourceType === resourceFilter;
      const query = searchText.trim().toLowerCase();
      const textMatch =
        query.length === 0 ||
        entry.action.toLowerCase().includes(query) ||
        entry.resourceId.toLowerCase().includes(query) ||
        entry.actorRole.toLowerCase().includes(query);
      return resourceMatch && textMatch;
    });
  }, [entries, resourceFilter, searchText]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audit-log-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log Console</h1>
        <p className="mt-2 text-slate-600">
          Oversight view aligned with `AuditLog` model direction for governance and compliance.
        </p>
      </header>

      <div className="admin-content-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Resource type</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setResourceFilter(event.target.value)}
              value={resourceFilter}
            >
              <option value="all">All</option>
              {Array.from(new Set(entries.map(entry => entry.resourceType))).map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Search action/resource/role</span>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setSearchText(event.target.value)}
              value={searchText}
            />
          </label>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
            onClick={exportJson}
            type="button"
          >
            Export filtered JSON
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{entry.createdAt}</td>
                  <td className="px-3 py-2">{entry.actorRole}</td>
                  <td className="px-3 py-2">{entry.action}</td>
                  <td className="px-3 py-2">
                    {entry.resourceType} / {entry.resourceId}
                  </td>
                  <td className="px-3 py-2">{entry.ipAddress ?? "N/A"}</td>
                  <td className="px-3 py-2">{entry.metadataJson}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

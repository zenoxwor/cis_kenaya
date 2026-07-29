"use client";

import { useState } from "react";
import type { ReceptionIncidentLogItem } from "@/lib/reception/portal-repository";

type Props = {
  initialRows: ReceptionIncidentLogItem[];
};

type ApiResponse = {
  success: boolean;
  data?: {
    rows: ReceptionIncidentLogItem[];
  };
  error?: string;
};

const INCIDENT_TYPES = ["Safety", "Complaint", "Maintenance", "Medical", "Other"] as const;
const PRIORITY_LEVELS = ["Low", "Medium", "Urgent"] as const;

export function IncidentsManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportToast, setReportToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({
    incidentType: "Complaint" as (typeof INCIDENT_TYPES)[number],
    personName: "",
    description: "",
    priority: "Medium" as (typeof PRIORITY_LEVELS)[number]
  });

  async function saveDailyReport() {
    setSavingReport(true);
    try {
      const response = await fetch("/api/reception/daily-report/snapshot", { method: "POST" });
      const payload = (await response.json()) as { success: boolean; error?: string };
      setReportToast({
        message: payload.success ? "Daily report saved successfully." : (payload.error ?? "Failed to save report."),
        ok: payload.success
      });
      setTimeout(() => setReportToast(null), 4000);
    } catch {
      setReportToast({ message: "Network error — report not saved.", ok: false });
      setTimeout(() => setReportToast(null), 4000);
    }
    setSavingReport(false);
  }

  async function refresh() {
    const response = await fetch("/api/reception/incidents");
    const payload = (await response.json()) as ApiResponse;
    if (payload.success && payload.data) {
      setRows(payload.data.rows);
    }
  }

  async function submit() {
    if (form.description.trim().length < 4) {
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/reception/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentType: form.incidentType,
        personName: form.personName.trim() || undefined,
        description: form.description.trim(),
        priority: form.priority
      })
    });
    const payload = (await response.json()) as ApiResponse;
    if (response.ok && payload.success) {
      setForm({
        incidentType: "Complaint",
        personName: "",
        description: "",
        priority: "Medium"
      });
      setToastMessage("Incident logged and routed to Principal");
      setTimeout(() => setToastMessage(null), 3200);
      await refresh();
    }
    setSubmitting(false);
  }

  return (
    <section className="space-y-4">
      {reportToast && (
        <div
          className={[
            "fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
            reportToast.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          ].join(" ")}
        >
          {reportToast.message}
        </div>
      )}

      <header className="admin-content-card flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incident &amp; Complaint Logging</h1>
          <p className="mt-1 text-sm text-slate-600">
            Log front-desk incidents and route them directly to the Principal.
          </p>
        </div>
        <button
          type="button"
          disabled={savingReport}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => { void saveDailyReport(); }}
        >
          {savingReport ? "Saving…" : "Save Daily Report"}
        </button>
      </header>

      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
          {toastMessage}
        </div>
      )}

      <article className="admin-content-card space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">New incident</h2>

        <label className="block text-sm text-slate-700">
          Incident Type
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.incidentType}
            onChange={event =>
              setForm(prev => ({
                ...prev,
                incidentType: event.target.value as (typeof INCIDENT_TYPES)[number]
              }))
            }
          >
            {INCIDENT_TYPES.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Student/Person Name (optional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.personName}
            onChange={event => setForm(prev => ({ ...prev, personName: event.target.value }))}
            type="text"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Description
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.description}
            onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
          />
        </label>

        <label className="block text-sm text-slate-700">
          Priority
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.priority}
            onChange={event =>
              setForm(prev => ({
                ...prev,
                priority: event.target.value as (typeof PRIORITY_LEVELS)[number]
              }))
            }
          >
            {PRIORITY_LEVELS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          disabled={submitting}
          onClick={() => {
            void submit();
          }}
        >
          {submitting ? "Saving..." : "Log incident"}
        </button>
      </article>

      <article className="admin-content-card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Today&apos;s incidents logged by you</h2>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Student/Person</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Department</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{new Date(item.createdAt).toLocaleTimeString("en-KE")}</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2">{item.personName ?? "—"}</td>
                <td className="px-3 py-2">{item.priority}</td>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2">{item.targetDepartment}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={6}>
                  No incidents logged by you today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}

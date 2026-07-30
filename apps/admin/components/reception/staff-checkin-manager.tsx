"use client";

import { useState } from "react";
import type { ReceptionStaffAttendanceRow } from "@/lib/reception/portal-repository";
import type { SavedDailyReport } from "@/lib/reception/daily-report-snapshot";

type Props = {
  initialRows: ReceptionStaffAttendanceRow[];
  savedReports: SavedDailyReport[];
  savedReportsError?: string;
};

type ApiResponse = {
  success: boolean;
  data?: { rows: ReceptionStaffAttendanceRow[] };
  error?: string;
};

type EditState = {
  entryTime: string;
  outTime: string;
  saving: boolean;
  error: string | null;
};

function formatTime(value: string | null) {
  if (!value) return "\u2014";
  return new Date(value).toLocaleTimeString("en-KE");
}

function isoToTimeInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function StaffCheckinManager({ initialRows, savedReports, savedReportsError }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportToast, setReportToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [editMap, setEditMap] = useState<Record<string, EditState>>({});

  function showToast(message: string, ok: boolean) {
    setReportToast({ message, ok });
    setTimeout(() => setReportToast(null), 4000);
  }

  async function saveDailyReport() {
    setSavingReport(true);
    try {
      const response = await fetch("/api/reception/daily-report/snapshot", { method: "POST" });
      const payload = (await response.json()) as { success: boolean; error?: string };
      showToast(
        payload.success ? "Daily report saved successfully." : (payload.error ?? "Failed to save report."),
        payload.success
      );
    } catch {
      showToast("Network error — report not saved.", false);
    }
    setSavingReport(false);
  }

  async function refresh() {
    const response = await fetch("/api/reception/staff-attendance");
    const payload = (await response.json()) as ApiResponse;
    if (payload.success && payload.data) setRows(payload.data.rows);
  }

  async function mark(userId: string, action: "clockIn" | "clockOut") {
    setBusyUserId(userId);
    await fetch("/api/reception/staff-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action })
    });
    await refresh();
    setBusyUserId(null);
  }

  function startEdit(row: ReceptionStaffAttendanceRow) {
    setEditMap(prev => ({
      ...prev,
      [row.userId]: {
        entryTime: isoToTimeInput(row.entryTime ?? null),
        outTime: isoToTimeInput(row.outTime ?? null),
        saving: false,
        error: null
      }
    }));
  }

  function cancelEdit(userId: string) {
    setEditMap(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function saveEdit(userId: string) {
    const state = editMap[userId];
    if (!state) return;
    setEditMap(prev => ({ ...prev, [userId]: { ...prev[userId], saving: true, error: null } }));
    try {
      const res = await fetch("/api/reception/staff-attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, entryTime: state.entryTime || undefined, outTime: state.outTime || undefined })
      });
      const payload = (await res.json()) as { success: boolean; error?: string };
      if (payload.success) {
        cancelEdit(userId);
        await refresh();
        showToast("Times updated.", true);
      } else {
        setEditMap(prev => ({
          ...prev,
          [userId]: { ...prev[userId], saving: false, error: payload.error ?? "Failed to update." }
        }));
      }
    } catch {
      setEditMap(prev => ({ ...prev, [userId]: { ...prev[userId], saving: false, error: "Network error." } }));
    }
  }

  return (
    <section className="space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-900">Staff Daily Attendance Tracker</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track front-desk daily staff in/out activity with real-time action timestamps.
          </p>
        </div>
        <button
          type="button"
          disabled={savingReport}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            void saveDailyReport();
          }}
        >
          {savingReport ? "Saving\u2026" : "Save Daily Report"}
        </button>
      </header>

      <div className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Staff Name</th>
              <th className="px-3 py-2">Staff ID</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Entry Time</th>
              <th className="px-3 py-2">Out Time</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const editing = editMap[row.userId];
              return (
                <tr key={row.userId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.staffName}</td>
                  <td className="px-3 py-2">{row.staffId}</td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        row.status === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input
                        type="time"
                        value={editing.entryTime}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onChange={e =>
                          setEditMap(prev => ({
                            ...prev,
                            [row.userId]: { ...prev[row.userId], entryTime: e.target.value }
                          }))
                        }
                      />
                    ) : (
                      formatTime(row.entryTime ?? null)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <input
                        type="time"
                        value={editing.outTime}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        onChange={e =>
                          setEditMap(prev => ({
                            ...prev,
                            [row.userId]: { ...prev[row.userId], outTime: e.target.value }
                          }))
                        }
                      />
                    ) : (
                      formatTime(row.outTime ?? null)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={editing.saving}
                            className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            onClick={() => {
                              void saveEdit(row.userId);
                            }}
                          >
                            {editing.saving ? "Saving\u2026" : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={editing.saving}
                            className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                            onClick={() => cancelEdit(row.userId)}
                          >
                            Cancel
                          </button>
                        </div>
                        {editing.error && <p className="text-xs text-red-600">{editing.error}</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busyUserId === row.userId || row.status === "IN"}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            void mark(row.userId, "clockIn");
                          }}
                        >
                          Clock In
                        </button>
                        <button
                          type="button"
                          disabled={busyUserId === row.userId || row.status === "OUT"}
                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            void mark(row.userId, "clockOut");
                          }}
                        >
                          Clock Out
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-content-card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Saved Daily Reports</h2>
        {savedReportsError && <p className="text-sm text-red-600">Error loading reports: {savedReportsError}</p>}
        {!savedReportsError && savedReports.length === 0 && (
          <p className="text-sm text-slate-500">No saved reports yet.</p>
        )}
        {savedReports.length > 0 && (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Report Date</th>
                <th className="px-3 py-2">JSON</th>
                <th className="px-3 py-2">CSV</th>
              </tr>
            </thead>
            <tbody>
              {savedReports.map(r => (
                <tr key={r.date} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{r.date}</td>
                  <td className="px-3 py-2">
                    <a href={r.jsonUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      Download JSON
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <a href={r.csvUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      Download CSV
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { ReceptionStaffAttendanceRow } from "@/lib/reception/portal-repository";
import type { ListDailyReportsResult } from "@/lib/reception/daily-report-snapshot";

type Props = {
  initialRows: ReceptionStaffAttendanceRow[];
  savedReports: ListDailyReportsResult;
};

type ApiResponse = {
  success: boolean;
  data?: {
    rows: ReceptionStaffAttendanceRow[];
    row?: ReceptionStaffAttendanceRow;
  };
  error?: string;
};

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-KE");
}

function toInputTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function StaffCheckinManager({ initialRows, savedReports }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportToast, setReportToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [attendanceToast, setAttendanceToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingEntryTime, setEditingEntryTime] = useState("");
  const [editingOutTime, setEditingOutTime] = useState("");

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
    const response = await fetch("/api/reception/staff-attendance");
    const payload = (await response.json()) as ApiResponse;
    if (payload.success && payload.data) {
      setRows(payload.data.rows);
    }
  }

  async function mark(userId: string, action: "clockIn" | "clockOut") {
    setBusyUserId(userId);
    try {
      await fetch("/api/reception/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action })
      });
      await refresh();
    } finally {
      setBusyUserId(null);
    }
  }

  function beginEdit(row: ReceptionStaffAttendanceRow) {
    setEditingUserId(row.userId);
    setEditingEntryTime(toInputTime(row.entryTime));
    setEditingOutTime(toInputTime(row.outTime));
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditingEntryTime("");
    setEditingOutTime("");
  }

  async function saveEditedTimes(userId: string) {
    if (!editingEntryTime && !editingOutTime) {
      setAttendanceToast({ message: "Set Entry Time or Out Time before saving.", ok: false });
      setTimeout(() => setAttendanceToast(null), 4000);
      return;
    }

    setBusyUserId(userId);
    try {
      const response = await fetch("/api/reception/staff-attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          entryTime: editingEntryTime || undefined,
          outTime: editingOutTime || undefined
        })
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        setAttendanceToast({
          message: payload.error ?? "Failed to update attendance times.",
          ok: false
        });
        setTimeout(() => setAttendanceToast(null), 4000);
        return;
      }

      await refresh();
      cancelEdit();
      setAttendanceToast({ message: "Attendance times updated.", ok: true });
      setTimeout(() => setAttendanceToast(null), 4000);
    } catch {
      setAttendanceToast({ message: "Network error — update failed.", ok: false });
      setTimeout(() => setAttendanceToast(null), 4000);
    } finally {
      setBusyUserId(null);
    }
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
      {attendanceToast && (
        <div
          className={[
            "fixed right-4 top-20 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
            attendanceToast.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          ].join(" ")}
        >
          {attendanceToast.message}
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
          onClick={() => { void saveDailyReport(); }}
        >
          {savingReport ? "Saving…" : "Save Daily Report"}
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
              <th className="px-3 py-2">Last Action Time</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.userId} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{row.staffName}</td>
                <td className="px-3 py-2">{row.staffId}</td>
                <td className="px-3 py-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      row.status === "IN"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    ].join(" ")}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2">{formatTime(row.entryTime)}</td>
                <td className="px-3 py-2">{formatTime(row.outTime)}</td>
                <td className="px-3 py-2">{formatTime(row.lastActionTime)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyUserId === row.userId || row.status === "IN" || editingUserId === row.userId}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        void mark(row.userId, "clockIn");
                      }}
                    >
                      Clock In
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === row.userId || row.status === "OUT" || editingUserId === row.userId}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        void mark(row.userId, "clockOut");
                      }}
                    >
                      Clock Out
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === row.userId}
                      className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        beginEdit(row);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  {editingUserId === row.userId && (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className="flex flex-col text-xs text-slate-600">
                        Entry Time
                        <input
                          type="time"
                          value={editingEntryTime}
                          onChange={event => setEditingEntryTime(event.target.value)}
                          className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                        />
                      </label>
                      <label className="flex flex-col text-xs text-slate-600">
                        Out Time
                        <input
                          type="time"
                          value={editingOutTime}
                          onChange={event => setEditingOutTime(event.target.value)}
                          className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busyUserId === row.userId}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          void saveEditedTimes(row.userId);
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={busyUserId === row.userId}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-content-card space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Saved Daily Reports</h2>
        {savedReports.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {savedReports.error}
          </p>
        ) : savedReports.reports.length === 0 ? (
          <p className="text-sm text-slate-500">No saved reports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Report Date</th>
                  <th className="px-3 py-2">JSON</th>
                  <th className="px-3 py-2">CSV</th>
                </tr>
              </thead>
              <tbody>
                {savedReports.reports.map(report => (
                  <tr key={report.date} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{report.date}</td>
                    <td className="px-3 py-2">
                      {report.jsonUrl ? (
                        <a
                          href={report.jsonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          Download JSON
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {report.csvUrl ? (
                        <a
                          href={report.csvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          Download CSV
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

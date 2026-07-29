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
  };
  error?: string;
};

const CAMPUS_TIME_ZONE = "Africa/Nairobi";

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-KE", {
    timeZone: CAMPUS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toTimeInputValue(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(value));
  const hour = parts.find(part => part.type === "hour")?.value ?? "00";
  const minute = parts.find(part => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function StaffCheckinManager({ initialRows, savedReports }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [draftEntryTime, setDraftEntryTime] = useState("");
  const [draftOutTime, setDraftOutTime] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [reportToast, setReportToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [attendanceToast, setAttendanceToast] = useState<{ message: string; ok: boolean } | null>(null);

  function showAttendanceToast(message: string, ok: boolean) {
    setAttendanceToast({ message, ok });
    setTimeout(() => setAttendanceToast(null), 4000);
  }

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

  async function mark(userId: string, action: "clockIn" | "clockOut") {
    setBusyUserId(userId);
    try {
      const response = await fetch("/api/reception/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action })
      });
      const payload = (await response.json()) as ApiResponse;
      if (!payload.success || !payload.data) {
        showAttendanceToast(payload.error ?? "Failed to update attendance.", false);
        return;
      }
      setRows(payload.data.rows);
      showAttendanceToast("Attendance updated.", true);
    } catch {
      showAttendanceToast("Network error — attendance not updated.", false);
    } finally {
      setBusyUserId(null);
    }
  }

  function startEditing(row: ReceptionStaffAttendanceRow) {
    setEditingUserId(row.userId);
    setDraftEntryTime(toTimeInputValue(row.entryTime));
    setDraftOutTime(toTimeInputValue(row.outTime));
  }

  function cancelEditing() {
    setEditingUserId(null);
    setDraftEntryTime("");
    setDraftOutTime("");
  }

  async function saveEditedTimes(userId: string) {
    if (!draftEntryTime && !draftOutTime) {
      showAttendanceToast("Set entry time or out time before saving.", false);
      return;
    }
    if (draftEntryTime && draftOutTime && draftOutTime < draftEntryTime) {
      showAttendanceToast("Out time cannot be earlier than entry time.", false);
      return;
    }

    setBusyUserId(userId);
    try {
      const response = await fetch("/api/reception/staff-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          entryTime: draftEntryTime || undefined,
          outTime: draftOutTime || undefined
        })
      });
      const payload = (await response.json()) as ApiResponse;
      if (!payload.success || !payload.data) {
        showAttendanceToast(payload.error ?? "Failed to save times.", false);
        return;
      }
      setRows(payload.data.rows);
      cancelEditing();
      showAttendanceToast("Entry and out times saved.", true);
    } catch {
      showAttendanceToast("Network error — times not saved.", false);
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
            {rows.map(row => {
              const isEditing = editingUserId === row.userId;
              const isBusy = busyUserId === row.userId;
              return (
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
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="time"
                        value={draftEntryTime}
                        onChange={event => setDraftEntryTime(event.target.value)}
                        className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    ) : (
                      formatTime(row.entryTime)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="time"
                        value={draftOutTime}
                        onChange={event => setDraftOutTime(event.target.value)}
                        className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    ) : (
                      formatTime(row.outTime)
                    )}
                  </td>
                  <td className="px-3 py-2">{formatTime(row.lastActionTime)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy || row.status === "IN" || isEditing}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          void mark(row.userId, "clockIn");
                        }}
                      >
                        Clock In
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || row.status === "OUT" || isEditing}
                        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          void mark(row.userId, "clockOut");
                        }}
                      >
                        Clock Out
                      </button>
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              void saveEditedTimes(row.userId);
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy || (editingUserId !== null && !isEditing)}
                          className="rounded-lg border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => startEditing(row)}
                        >
                          Edit Times
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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

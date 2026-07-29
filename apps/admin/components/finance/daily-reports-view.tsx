"use client";

import { useState } from "react";
import type { DailyReportSnapshot } from "@/lib/reception/daily-report-snapshot";

type ReportFile = {
  date: string;
  jsonUrl: string | null;
  csvUrl: string | null;
};

type Props = {
  files: ReportFile[];
  todaySnapshot: DailyReportSnapshot | null;
};

function SectionToggle({
  title,
  count,
  children
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100"
        onClick={() => setOpen(o => !o)}
      >
        <span>
          {title}{" "}
          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {count}
          </span>
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}

export function DailyReportsView({ files, todaySnapshot }: Props) {
  const [savingReport, setSavingReport] = useState(false);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  async function saveTodayReport() {
    setSavingReport(true);
    try {
      const response = await fetch("/api/reception/daily-report/snapshot", { method: "POST" });
      const payload = (await response.json()) as { success: boolean; error?: string };
      setToast({
        message: payload.success
          ? "Daily report saved — reload the page to see updated data."
          : (payload.error ?? "Failed to save report."),
        ok: payload.success
      });
      setTimeout(() => setToast(null), 5000);
    } catch {
      setToast({ message: "Network error — report not saved.", ok: false });
      setTimeout(() => setToast(null), 4000);
    }
    setSavingReport(false);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={[
            "fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg",
            toast.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          ].join(" ")}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="admin-content-card flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reception Daily Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            View and download daily reception operation snapshots for finance review.
          </p>
        </div>
        <button
          type="button"
          disabled={savingReport}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => { void saveTodayReport(); }}
        >
          {savingReport ? "Saving…" : "Save Today's Report"}
        </button>
      </div>

      {/* Available reports table */}
      <div className="admin-content-card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Available Reports</h2>
        {files.length === 0 ? (
          <p className="text-sm text-slate-500">
            No reports saved yet. Use the &quot;Save Today&apos;s Report&quot; button above or
            the button on the check-in or incidents pages.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">JSON</th>
                  <th className="px-3 py-2">CSV</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.date} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{file.date}</td>
                    <td className="px-3 py-2">
                      {file.jsonUrl ? (
                        <a
                          href={file.jsonUrl}
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
                      {file.csvUrl ? (
                        <a
                          href={file.csvUrl}
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

      {/* Today's report inline */}
      {todaySnapshot && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Today&apos;s Report —{" "}
            <span className="font-normal text-slate-600">{todaySnapshot.date}</span>
          </h2>

          {/* Visitors */}
          <SectionToggle title="Visitors / Gate Passes" count={todaySnapshot.visitors.length}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Pass #</th>
                  <th className="px-3 py-2">Visitor</th>
                  <th className="px-3 py-2">Host</th>
                  <th className="px-3 py-2">Purpose</th>
                  <th className="px-3 py-2">Entry</th>
                  <th className="px-3 py-2">Exit</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySnapshot.visitors.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={7}>
                      No visitors recorded today.
                    </td>
                  </tr>
                ) : (
                  todaySnapshot.visitors.map(v => (
                    <tr key={v.passNumber} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs">{v.passNumber}</td>
                      <td className="px-3 py-2">{v.visitorName}</td>
                      <td className="px-3 py-2">{v.hostName}</td>
                      <td className="px-3 py-2">{v.purpose}</td>
                      <td className="px-3 py-2">
                        {new Date(v.entryTime).toLocaleTimeString("en-KE")}
                      </td>
                      <td className="px-3 py-2">
                        {v.exitTime ? new Date(v.exitTime).toLocaleTimeString("en-KE") : "—"}
                      </td>
                      <td className="px-3 py-2">{v.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionToggle>

          {/* Incidents */}
          <SectionToggle title="Incidents" count={todaySnapshot.incidents.length}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Person</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reported By</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {todaySnapshot.incidents.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={6}>
                      No incidents recorded today.
                    </td>
                  </tr>
                ) : (
                  todaySnapshot.incidents.map(i => (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{i.title}</td>
                      <td className="px-3 py-2">{i.studentName ?? "—"}</td>
                      <td className="px-3 py-2">{i.severity}</td>
                      <td className="px-3 py-2">{i.status}</td>
                      <td className="px-3 py-2">{i.reportedBy}</td>
                      <td className="px-3 py-2">
                        {new Date(i.createdAt).toLocaleTimeString("en-KE")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionToggle>

          {/* Appointments */}
          <SectionToggle title="Appointments" count={todaySnapshot.appointments.length}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Meeting With</th>
                  <th className="px-3 py-2">Visitor</th>
                  <th className="px-3 py-2">Scheduled</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySnapshot.appointments.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={5}>
                      No appointments scheduled today.
                    </td>
                  </tr>
                ) : (
                  todaySnapshot.appointments.map(a => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{a.title}</td>
                      <td className="px-3 py-2">{a.hostName}</td>
                      <td className="px-3 py-2">{a.visitorName}</td>
                      <td className="px-3 py-2">
                        {new Date(a.scheduledAt).toLocaleTimeString("en-KE")}
                      </td>
                      <td className="px-3 py-2">{a.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionToggle>

          {/* Staff Attendance */}
          <SectionToggle title="Staff Attendance" count={todaySnapshot.staffAttendance.length}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Staff Name</th>
                  <th className="px-3 py-2">Check In</th>
                  <th className="px-3 py-2">Check Out</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySnapshot.staffAttendance.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={4}>
                      No staff attendance recorded today.
                    </td>
                  </tr>
                ) : (
                  todaySnapshot.staffAttendance.map(s => (
                    <tr key={s.userId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{s.staffName}</td>
                      <td className="px-3 py-2">
                        {s.checkIn ? new Date(s.checkIn).toLocaleTimeString("en-KE") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {s.checkOut ? new Date(s.checkOut).toLocaleTimeString("en-KE") : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            s.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          ].join(" ")}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionToggle>
        </div>
      )}

      {!todaySnapshot && files.length > 0 && (
        <div className="admin-content-card text-sm text-slate-500">
          Today&apos;s report has not been saved yet. Click &quot;Save Today&apos;s Report&quot; to
          generate it.
        </div>
      )}
    </div>
  );
}

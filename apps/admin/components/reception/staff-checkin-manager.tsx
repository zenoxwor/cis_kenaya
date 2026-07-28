"use client";

import { useState } from "react";
import type { ReceptionStaffAttendanceRow } from "@/lib/reception/portal-repository";

type Props = {
  initialRows: ReceptionStaffAttendanceRow[];
};

type ApiResponse = {
  success: boolean;
  data?: {
    rows: ReceptionStaffAttendanceRow[];
  };
  error?: string;
};

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-KE");
}

export function StaffCheckinManager({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/reception/staff-attendance");
    const payload = (await response.json()) as ApiResponse;
    if (payload.success && payload.data) {
      setRows(payload.data.rows);
    }
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

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Staff Daily Attendance Tracker</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track front-desk daily staff in/out activity with real-time action timestamps.
        </p>
      </header>

      <div className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Staff Name</th>
              <th className="px-3 py-2">Staff ID</th>
              <th className="px-3 py-2">Status</th>
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
                <td className="px-3 py-2">{formatTime(row.lastActionTime)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyUserId === row.userId || row.status === "IN"}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        void mark(row.userId, "clockIn");
                      }}
                    >
                      Clock In
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === row.userId || row.status === "OUT"}
                      className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        void mark(row.userId, "clockOut");
                      }}
                    >
                      Clock Out
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

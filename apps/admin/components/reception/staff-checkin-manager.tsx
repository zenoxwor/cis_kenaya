"use client";

import { useEffect, useMemo, useState } from "react";
import type { StaffCheckInRow } from "@/lib/reception/types";

type Props = {
  initialRows: StaffCheckInRow[];
  initialOnSiteCount: number;
};

type CheckInResponse = {
  success: boolean;
  data?: {
    rows: StaffCheckInRow[];
    onSiteCount: number;
  };
};

export function StaffCheckinManager({ initialRows, initialOnSiteCount }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [onSiteCount, setOnSiteCount] = useState(initialOnSiteCount);
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const roles = useMemo(
    () => Array.from(new Set(initialRows.map(row => row.role))).sort((a, b) => a.localeCompare(b)),
    [initialRows]
  );
  const departments = useMemo(
    () => Array.from(new Set(initialRows.map(row => row.department))).sort((a, b) => a.localeCompare(b)),
    [initialRows]
  );

  useEffect(() => {
    const search = new URLSearchParams({
      section: "checkins",
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(departmentFilter ? { department: departmentFilter } : {})
    });
    void fetch(`/api/reception?${search.toString()}`)
      .then(res => res.json() as Promise<CheckInResponse>)
      .then(payload => {
        if (payload.success && payload.data) {
          setRows(payload.data.rows);
          setOnSiteCount(payload.data.onSiteCount);
        }
      });
  }, [departmentFilter, roleFilter]);

  async function mark(userId: string, checkAction: "checkIn" | "checkOut") {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "staff.mark",
        userId,
        checkAction
      })
    });

    const params = new URLSearchParams({
      section: "checkins",
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(departmentFilter ? { department: departmentFilter } : {})
    });
    const response = await fetch(`/api/reception?${params.toString()}`);
    const payload = (await response.json()) as CheckInResponse;
    if (payload.success && payload.data) {
      setRows(payload.data.rows);
      setOnSiteCount(payload.data.onSiteCount);
    }
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Staff Check-In / Check-Out</h1>
        <p className="mt-1 text-sm text-slate-600">
          Live on-site counter for emergency and daily front-desk visibility.
        </p>
        <p className="mt-3 inline-flex rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
          On-site now: {onSiteCount}
        </p>
      </header>

      <div className="admin-content-card flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={roleFilter}
          onChange={event => setRoleFilter(event.target.value)}
        >
          <option value="">All roles</option>
          {roles.map(role => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={departmentFilter}
          onChange={event => setDepartmentFilter(event.target.value)}
        >
          <option value="">All departments</option>
          {departments.map(department => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Department</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Check-In</th>
              <th className="px-3 py-2">Check-Out</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.userId} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{row.fullName}</td>
                <td className="px-3 py-2">{row.role}</td>
                <td className="px-3 py-2">{row.department}</td>
                <td className="px-3 py-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      row.status === "PRESENT"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    ].join(" ")}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2">{row.checkInTime ? new Date(row.checkInTime).toLocaleTimeString("en-KE") : "—"}</td>
                <td className="px-3 py-2">{row.checkOutTime ? new Date(row.checkOutTime).toLocaleTimeString("en-KE") : "—"}</td>
                <td className="px-3 py-2">
                  {row.status === "PRESENT" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        void mark(row.userId, "checkOut");
                      }}
                    >
                      Check out
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                      onClick={() => {
                        void mark(row.userId, "checkIn");
                      }}
                    >
                      Check in
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

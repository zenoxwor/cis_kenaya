"use client";

import { useEffect, useState } from "react";
import type { EarlyPickupLogItem, EarlyPickupStudentProfile } from "@/lib/reception/types";

type Props = {
  initialLogs: EarlyPickupLogItem[];
};

type EarlyPickupPayload = {
  success: boolean;
  data?: {
    logs: EarlyPickupLogItem[];
    students: EarlyPickupStudentProfile[];
  };
};

export function EarlyPickupManager({ initialLogs }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<EarlyPickupStudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    const timer = window.setTimeout(async () => {
      const response = await fetch(
        `/api/reception?section=early-pickup&q=${encodeURIComponent(trimmed)}`
      );
      const payload = (await response.json()) as EarlyPickupPayload;
      if (payload.success && payload.data) {
        setStudents(payload.data.students);
        setLogs(payload.data.logs);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const selectedStudent = students.find(student => student.id === selectedStudentId);

  async function issuePass() {
    if (!selectedStudentId || !selectedGuardianId) {
      return;
    }
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "pickup.issue",
        studentId: selectedStudentId,
        guardianId: selectedGuardianId,
        notes
      })
    });
    setNotes("");
    const response = await fetch("/api/reception?section=early-pickup");
    const payload = (await response.json()) as EarlyPickupPayload;
    if (payload.success && payload.data) {
      setLogs(payload.data.logs);
    }
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Early Pick-Up & Guardian Verification</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verify authorized guardians before issuing an early release pass.
        </p>
      </header>

      <article className="admin-content-card space-y-3">
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Search student by name or student ID..."
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        {students.length > 0 && (
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={selectedStudentId}
            onChange={event => {
              setSelectedStudentId(event.target.value);
              setSelectedGuardianId("");
            }}
          >
            <option value="">Select student</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.fullName} ({student.studentCode})
              </option>
            ))}
          </select>
        )}

        {selectedStudent && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">Authorized pickup contacts</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {selectedStudent.authorizedGuardians.map(guardian => (
                <button
                  key={guardian.id}
                  type="button"
                  onClick={() => setSelectedGuardianId(guardian.id)}
                  className={[
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    selectedGuardianId === guardian.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white"
                  ].join(" ")}
                >
                  <p className="font-semibold text-slate-900">{guardian.fullName}</p>
                  <p className="text-xs text-slate-500">
                    Phone: {guardian.phoneNumber} • ID: {guardian.nationalId ?? "—"}
                  </p>
                </button>
              ))}
            </div>
            <textarea
              className="mt-3 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Release notes..."
              value={notes}
              onChange={event => setNotes(event.target.value)}
            />
            <button
              type="button"
              className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              onClick={() => {
                void issuePass();
              }}
            >
              Issue early release pass
            </button>
          </div>
        )}
      </article>

      <article className="admin-content-card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Early release log</h2>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Pass</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Guardian</th>
              <th className="px-3 py-2">Verified by</th>
              <th className="px-3 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-900">{item.releasePassNumber}</td>
                <td className="px-3 py-2">
                  {item.studentName}
                  <p className="text-xs text-slate-500">{item.studentCode}</p>
                </td>
                <td className="px-3 py-2">
                  {item.guardianName}
                  <p className="text-xs text-slate-500">ID: {item.guardianNationalId ?? "—"}</p>
                </td>
                <td className="px-3 py-2">{item.verifiedByName}</td>
                <td className="px-3 py-2">{new Date(item.checkOutTime).toLocaleString("en-KE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

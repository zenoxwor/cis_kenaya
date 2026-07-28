"use client";

import { useEffect, useState } from "react";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import type {
  ReceptionDashboardData,
  ReceptionSearchResults
} from "@/lib/reception/types";

type Props = {
  initialDashboard: ReceptionDashboardData;
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="admin-content-card">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

export function ReceptionDashboard({ initialDashboard }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReceptionSearchResults>({
    students: [],
    guardians: [],
    staff: []
  });
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ students: [], guardians: [], staff: [] });
      return;
    }

    const timer = window.setTimeout(async () => {
      const response = await fetch(
        `/api/reception?section=search&q=${encodeURIComponent(trimmed)}`
      );
      const payload = (await response.json()) as {
        success: boolean;
        data?: ReceptionSearchResults;
      };
      if (response.ok && payload.success && payload.data) {
        setResults(payload.data);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
          Front Desk & Receptionist Portal
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Reception Command Center</h1>
        <p className="mt-2 text-sm text-slate-600">
          Real-time student/guardian/staff lookup, admissions intake, and front-desk live operations.
        </p>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700">Global search</label>
          <input
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="Search by name, student ID, national ID, phone number..."
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={initialDashboard.stats.students} />
        <StatCard label="Guardians" value={initialDashboard.stats.guardians} />
        <StatCard label="Staff on-site" value={initialDashboard.stats.onSiteStaff} />
        <StatCard label="Open incidents" value={initialDashboard.stats.openIncidents} />
      </div>

      {(results.students.length > 0 || results.guardians.length > 0 || results.staff.length > 0) && (
        <section className="admin-content-card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Search results</h2>

          {results.students.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Students</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {results.students.map(student => (
                  <article key={student.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">
                      {student.fullName} <span className="text-xs text-slate-500">({student.studentCode})</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      National ID: {student.nationalId ?? "—"} • Phone: {student.phoneNumber ?? "—"}
                    </p>
                    {student.missingDocuments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {student.missingDocuments.map(document => (
                          <span
                            key={document}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                          >
                            Missing {document}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {results.guardians.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Guardians</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {results.guardians.map(guardian => (
                  <article key={guardian.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{guardian.fullName}</p>
                    <p className="text-xs text-slate-500">
                      Phone: {guardian.phoneNumber} • National ID: {guardian.nationalId ?? "—"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {results.staff.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Staff</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {results.staff.map(staff => (
                  <article key={staff.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{staff.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {staff.role} • {staff.department} • Phone: {staff.phoneNumber ?? "—"}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="admin-content-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">6-Step Student Registration</h2>
            <p className="text-sm text-slate-600">
              Reuses the admissions wizard directly in reception for walk-in registrations.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            onClick={() => setShowWizard(prev => !prev)}
          >
            {showWizard ? "Hide wizard" : "Open wizard"}
          </button>
        </div>
      </section>

      {showWizard && <RegistrationWizard />}
    </section>
  );
}

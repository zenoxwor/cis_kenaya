"use client";

import { useEffect, useMemo, useState } from "react";

type PreRegistration = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  grade_level: string;
  curriculum: string;
  status: "unverified" | "verified";
  verification_token: string;
  created_at: string;
};

type PreRegistrationResponse = {
  success: boolean;
  data?: PreRegistration[];
  message?: string;
};

type ResendResponse = {
  success: boolean;
  message?: string;
};

const PAGE_SIZE = 10;

export function PreRegistrationsManager() {
  const [rows, setRows] = useState<PreRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function fetchRows() {
    const response = await fetch("/api/public/preregister", { method: "GET" });
    const payload = (await response.json()) as PreRegistrationResponse;
    if (!response.ok || !payload.success || !payload.data) {
      setError(payload.message ?? "Failed to load pre-registrations.");
      return;
    }

    setRows(payload.data);
    setError(null);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await fetchRows();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchRows();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter(entry => {
      const fullName = `${entry.first_name} ${entry.last_name}`.toLowerCase();
      return fullName.includes(query) || entry.email.toLowerCase().includes(query);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function resendVerificationEmail(registrationId: string) {
    setResendingId(registrationId);
    setError(null);

    const response = await fetch("/api/public/preregister", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "resend_verification",
        registration_id: registrationId
      })
    });

    const payload = (await response.json()) as ResendResponse;
    if (!response.ok || !payload.success) {
      setError(payload.message ?? "Failed to resend verification email.");
      setResendingId(null);
      return;
    }

    await fetchRows();
    setResendingId(null);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pre-Registrations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor Cambridge intake requests and verification status in real time.
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name or email"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm md:w-80"
        />
      </header>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <article className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Curriculum</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Registered At</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && pagedRows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
                  No pre-registrations found.
                </td>
              </tr>
            )}
            {pagedRows.map(row => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.first_name} {row.last_name}
                </td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{row.phone}</td>
                <td className="px-3 py-2">{row.grade_level}</td>
                <td className="px-3 py-2">{row.curriculum}</td>
                <td className="px-3 py-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      row.status === "verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    ].join(" ")}
                  >
                    {row.status === "verified" ? "Verified" : "Unverified"}
                  </span>
                </td>
                <td className="px-3 py-2">{new Date(row.created_at).toLocaleString("en-KE")}</td>
                <td className="px-3 py-2">
                  {row.status === "unverified" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
                      disabled={resendingId === row.id}
                      onClick={() => {
                        void resendVerificationEmail(row.id);
                      }}
                    >
                      {resendingId === row.id ? "Sending..." : "Resend Verification Email"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <footer className="admin-content-card flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Page {safeCurrentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(previous => Math.max(1, previous - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(previous => Math.min(totalPages, previous + 1))}
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  );
}

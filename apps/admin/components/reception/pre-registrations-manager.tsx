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
  application_ref: string | null;
  created_at: string;
  documents: UploadedDocument[];
  student_id: string | null;
};

type UploadedDocument = {
  documentType: string;
  label: string;
  fileName: string;
  fileType: string;
  storagePath: string;
};

type SignedDocument = UploadedDocument & {
  signedUrl: string | null;
  error: string | null;
};

type SchoolClassOption = {
  id: string;
  name: string;
  gradeLevel: string;
  campus: {
    name: string;
  };
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

type DocumentsResponse = {
  success: boolean;
  message?: string;
  data?: SignedDocument[];
};

type VerifyRegistrationResponse = {
  success: boolean;
  error?: string;
  studentId?: string;
  studentRecordId?: string;
  uploadLink?: string;
};

type ClassesResponse = {
  classes: SchoolClassOption[];
};

const PAGE_SIZE = 10;

export function PreRegistrationsManager() {
  const [rows, setRows] = useState<PreRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsName, setDocumentsName] = useState("");
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<PreRegistration | null>(null);
  const [classOptions, setClassOptions] = useState<SchoolClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    assignedClassId: "",
    assignedSection: "",
    generateInvoice: false
  });

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

  async function fetchClassOptions(): Promise<SchoolClassOption[]> {
    setLoadingClasses(true);
    const response = await fetch("/api/classes", { method: "GET" });
    const payload = (await response.json()) as Partial<ClassesResponse> & { error?: string };

    if (!response.ok || !Array.isArray(payload.classes)) {
      setError(payload.error ?? "Failed to load classes.");
      setLoadingClasses(false);
      return [];
    }

    setClassOptions(payload.classes);
    setLoadingClasses(false);
    return payload.classes;
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
      return (
        fullName.includes(query) ||
        entry.email.toLowerCase().includes(query) ||
        entry.application_ref?.toLowerCase().includes(query)
      );
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
    setSuccessMessage(null);

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

    setSuccessMessage("Verification email sent.");
    await fetchRows();
    setResendingId(null);
  }

  async function openDocuments(row: PreRegistration) {
    setDocumentsModalOpen(true);
    setDocumentsLoading(true);
    setDocumentsError(null);
    setDocumentsName(`${row.first_name} ${row.last_name}`);
    setSignedDocuments([]);

    const response = await fetch("/api/public/preregister", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "get_documents",
        registration_id: row.id
      })
    });

    const payload = (await response.json()) as DocumentsResponse;
    if (!response.ok || !payload.success) {
      setDocumentsError(payload.message ?? "Failed to load documents.");
      setDocumentsLoading(false);
      return;
    }

    setSignedDocuments(payload.data ?? []);
    setDocumentsLoading(false);
  }

  async function openVerifyModal(row: PreRegistration) {
    setVerifyTarget(row);
    setVerifyForm({
      assignedClassId: classOptions[0]?.id ?? "",
      assignedSection: "",
      generateInvoice: false
    });
    setVerifyModalOpen(true);
    setSuccessMessage(null);
    setError(null);
    if (classOptions.length === 0) {
      const loadedClasses = await fetchClassOptions();
      setVerifyForm(current => ({
        ...current,
        assignedClassId: current.assignedClassId || loadedClasses[0]?.id || ""
      }));
    }
  }

  async function confirmVerification() {
    if (!verifyTarget) {
      return;
    }
    if (!verifyForm.assignedClassId) {
      setError("Please select a class before confirming.");
      return;
    }

    setVerifyingId(verifyTarget.id);
    setError(null);
    setSuccessMessage(null);

    const response = await fetch("/api/admin/verify-registration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preRegistrationId: verifyTarget.id,
        assignedClassId: verifyForm.assignedClassId,
        assignedSection: verifyForm.assignedSection.trim() || undefined,
        generateInvoice: verifyForm.generateInvoice
      })
    });

    const payload = (await response.json()) as VerifyRegistrationResponse;
    if (!response.ok || !payload.success || !payload.studentRecordId || !payload.studentId) {
      setError(payload.error ?? "Failed to verify and create student record.");
      setVerifyingId(null);
      return;
    }

    setRows(previous =>
      previous.map(row =>
        row.id === verifyTarget.id
          ? {
              ...row,
              status: "verified",
              student_id: payload.studentRecordId ?? row.student_id
            }
          : row
      )
    );
    setSuccessMessage(
      payload.uploadLink
        ? `Student record created (${payload.studentId}). Parent upload link generated.`
        : `Student record created (${payload.studentId}).`
    );
    setVerifyingId(null);
    setVerifyModalOpen(false);
    setVerifyTarget(null);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pre-Registrations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review applications and create student records after admissions verification.
          </p>
        </div>
        <input
          type="search"
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name, email, or application ref"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm md:w-96"
        />
      </header>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
      {successMessage && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      <article className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Application Ref</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Registered At</th>
              <th className="px-3 py-2">Actions</th>
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
                <td className="px-3 py-2 font-semibold text-slate-700">{row.application_ref ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.first_name} {row.last_name}
                </td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{row.phone}</td>
                <td className="px-3 py-2">{row.grade_level}</td>
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
                  <div className="flex flex-wrap gap-2">
                    {row.status === "unverified" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
                        disabled={verifyingId === row.id || resendingId === row.id}
                        onClick={() => {
                          void openVerifyModal(row);
                        }}
                      >
                        {verifyingId === row.id && (
                          <span
                            className="h-3 w-3 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700"
                            aria-hidden="true"
                          />
                        )}
                        {verifyingId === row.id ? "Creating..." : "Verify & Create Student"}
                      </button>
                    )}
                    {row.status === "unverified" && (
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
                        disabled={resendingId === row.id || verifyingId === row.id}
                        onClick={() => {
                          void resendVerificationEmail(row.id);
                        }}
                      >
                        {resendingId === row.id ? "Sending..." : "Resend Verification Email"}
                      </button>
                    )}
                    {row.status === "verified" && row.student_id && (
                      <a
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        href={`/admin/reception/students/${encodeURIComponent(row.student_id)}`}
                      >
                        View Student Profile
                      </a>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        void openDocuments(row);
                      }}
                    >
                      View Documents ({row.documents?.length ?? 0})
                    </button>
                  </div>
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

      {verifyModalOpen && verifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Confirm Verification</h2>
                <p className="text-sm text-slate-600">
                  {verifyTarget.first_name} {verifyTarget.last_name} • {verifyTarget.application_ref ?? "No reference"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                onClick={() => {
                  setVerifyModalOpen(false);
                  setVerifyTarget(null);
                }}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Assign Class</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  value={verifyForm.assignedClassId}
                  disabled={loadingClasses || verifyingId === verifyTarget.id}
                  onChange={event =>
                    setVerifyForm(current => ({ ...current, assignedClassId: event.target.value }))
                  }
                >
                  <option value="">Select class</option>
                  {classOptions.map(classOption => (
                    <option key={classOption.id} value={classOption.id}>
                      {classOption.gradeLevel} • {classOption.name} ({classOption.campus.name})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-700">Section (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. A"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  value={verifyForm.assignedSection}
                  disabled={verifyingId === verifyTarget.id}
                  onChange={event =>
                    setVerifyForm(current => ({ ...current, assignedSection: event.target.value }))
                  }
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={verifyForm.generateInvoice}
                  disabled={verifyingId === verifyTarget.id}
                  onChange={event =>
                    setVerifyForm(current => ({ ...current, generateInvoice: event.target.checked }))
                  }
                />
                Generate initial admission fee invoice
              </label>

              <button
                type="button"
                disabled={verifyingId === verifyTarget.id || loadingClasses}
                className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                onClick={() => {
                  void confirmVerification();
                }}
              >
                {verifyingId === verifyTarget.id
                  ? "Creating Student Record..."
                  : "Confirm & Create Student Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {documentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Uploaded Documents</h2>
                <p className="text-sm text-slate-600">{documentsName}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                onClick={() => setDocumentsModalOpen(false)}
              >
                Close
              </button>
            </div>

            {documentsLoading && <p className="text-sm text-slate-600">Loading documents...</p>}
            {documentsError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {documentsError}
              </p>
            )}

            {!documentsLoading && !documentsError && signedDocuments.length === 0 && (
              <p className="text-sm text-slate-600">No uploaded documents for this registration.</p>
            )}

            {!documentsLoading && !documentsError && signedDocuments.length > 0 && (
              <ul className="space-y-2">
                {signedDocuments.map(document => (
                  <li
                    key={document.storagePath}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{document.label}</p>
                      <p className="text-xs text-slate-500">{document.fileName}</p>
                    </div>
                    {document.signedUrl ? (
                      <a
                        href={document.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-rose-600">{document.error ?? "Unavailable"}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

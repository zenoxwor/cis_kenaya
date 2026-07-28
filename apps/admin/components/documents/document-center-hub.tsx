"use client";

import { useMemo, useState } from "react";
import { useCurrentSession } from "@/components/providers/session-provider";
import { canPerformAction } from "@/lib/rbac/permissions";
import {
  DOCUMENT_VERIFICATION_STATUSES,
  type StudentDocumentRecord
} from "@/lib/document-center/types";

type DocumentCenterHubProps = {
  initialRecords: StudentDocumentRecord[];
};

type NoticeState = {
  tone: "success" | "error";
  message: string;
};

function statusClass(status: StudentDocumentRecord["status"]) {
  if (status === "verified") return "bg-emerald-100 text-emerald-700";
  if (status === "uploaded") return "bg-sky-100 text-sky-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "expired") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function toWaLink(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${normalized}`;
}

function isImageUrl(value: string | null) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  );
}

function isPdfUrl(value: string | null) {
  if (!value) return false;
  return value.toLowerCase().includes(".pdf");
}

export function DocumentCenterHub({ initialRecords }: DocumentCenterHubProps) {
  const user = useCurrentSession();
  const canUploadOrUpdate =
    canPerformAction(user.role, "student_document", "create") ||
    canPerformAction(user.role, "student_document", "edit");
  const canVerifyOrReject = canPerformAction(user.role, "student_document", "approve");

  const [records, setRecords] = useState<StudentDocumentRecord[]>(initialRecords);
  const [statusFilter, setStatusFilter] = useState<"all" | StudentDocumentRecord["status"]>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<StudentDocumentRecord | null>(null);

  const classOptions = useMemo(() => {
    const dedup = new Map<string, string>();
    for (const record of records) {
      dedup.set(record.classId, record.className);
    }
    return Array.from(dedup, ([id, name]) => ({ id, name }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (classFilter !== "all" && record.classId !== classFilter) return false;
      return true;
    });
  }, [classFilter, records, statusFilter]);

  async function runAction(body: Record<string, unknown>, successMessage: string) {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json()) as {
      success: boolean;
      error?: string;
      records?: StudentDocumentRecord[];
    };

    if (!response.ok || !payload.success || !payload.records) {
      setNotice({
        tone: "error",
        message: payload.error ?? "Failed to update document."
      });
      return;
    }

    setRecords(payload.records);
    setSelectedRecord(prev => {
      if (!prev) return null;
      return payload.records?.find(record => record.id === prev.id) ?? null;
    });
    setNotice({ tone: "success", message: successMessage });
  }

  async function handleTransition(
    record: StudentDocumentRecord,
    targetStatus: StudentDocumentRecord["status"],
    note?: string
  ) {
    setSavingDocumentId(record.id);
    await runAction(
      { action: "transition", documentId: record.id, targetStatus, note },
      `Document moved to ${targetStatus}.`
    );
    setSavingDocumentId(null);
  }

  return (
    <div className="space-y-5">
      <article className="admin-content-card space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              onChange={event =>
                setStatusFilter(event.target.value as "all" | StudentDocumentRecord["status"])
              }
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              {DOCUMENT_VERIFICATION_STATUSES.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Class</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              onChange={event => setClassFilter(event.target.value)}
              value={classFilter}
            >
              <option value="all">All classes</option>
              {classOptions.map(classOption => (
                <option key={classOption.id} value={classOption.id}>
                  {classOption.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {notice && (
          <div
            className={[
              "rounded-lg border px-4 py-3 text-sm",
              notice.tone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            ].join(" ")}
          >
            {notice.message}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Student ID &amp; Name</th>
                <th className="px-3 py-2">Class &amp; Section</th>
                <th className="px-3 py-2">Guardian Name</th>
                <th className="px-3 py-2">Document Type</th>
                <th className="px-3 py-2">Status Badge</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const saving = savingDocumentId === record.id;
                return (
                  <tr
                    key={record.id}
                    className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800">{record.studentCode}</p>
                      <p className="text-xs text-slate-600">{record.studentName}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <p>{record.className}</p>
                      <p className="text-xs text-slate-500">{record.section ?? "No section"}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{record.guardianName}</td>
                    <td className="px-3 py-3 text-slate-700">{record.documentName}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="space-y-2 px-3 py-3">
                      {record.signedUrl && (
                        <a
                          className="block w-full rounded border border-sky-200 px-2 py-1 text-center text-xs text-sky-700 hover:bg-sky-50"
                          href={record.signedUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                          onClick={event => event.stopPropagation()}
                        >
                          Preview
                        </a>
                      )}
                      {canVerifyOrReject && (
                        <button
                          className="block w-full rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          disabled={saving}
                          onClick={event => {
                            event.stopPropagation();
                            void handleTransition(record, "verified");
                          }}
                          type="button"
                        >
                          Approve
                        </button>
                      )}
                      {canVerifyOrReject && (
                        <button
                          className="block w-full rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          disabled={saving}
                          onClick={event => {
                            event.stopPropagation();
                            void handleTransition(record, "rejected");
                          }}
                          type="button"
                        >
                          Reject
                        </button>
                      )}
                      {canUploadOrUpdate && (
                        <button
                          className="block w-full rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                          disabled={saving}
                          onClick={event => {
                            event.stopPropagation();
                            void handleTransition(
                              record,
                              "uploaded",
                              "Replacement upload requested and intake status reset to uploaded."
                            );
                          }}
                          type="button"
                        >
                          Upload Replacement
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      {selectedRecord && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick Contact &amp; Document</h2>
              <p className="text-sm text-slate-600">
                {selectedRecord.studentCode} • {selectedRecord.studentName}
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold hover:bg-slate-50"
              onClick={() => setSelectedRecord(null)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <section className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">Student</p>
              <p className="mt-1 text-slate-700">Class: {selectedRecord.className}</p>
              <p className="text-slate-700">Section: {selectedRecord.section ?? "No section"}</p>
              <p className="text-slate-700">
                Document: {selectedRecord.documentName} ({selectedRecord.status})
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">Guardian Contacts</p>
              <p className="mt-1 text-slate-700">{selectedRecord.guardianName}</p>
              {selectedRecord.guardianPhones.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {selectedRecord.guardianPhones.map(phone => (
                    <p key={phone} className="text-xs text-slate-600">
                      <a className="text-brand-700 hover:underline" href={`tel:${phone}`}>
                        {phone}
                      </a>{" "}
                      •{" "}
                      <a
                        className="text-emerald-700 hover:underline"
                        href={toWaLink(phone)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        WhatsApp
                      </a>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">No phone on file.</p>
              )}
              <p className="mt-2 text-xs text-slate-600">
                Email: {selectedRecord.guardianEmail ?? "Not provided"}
              </p>
              <p className="text-xs text-slate-600">
                Address: {selectedRecord.guardianAddress ?? "Not provided"}
              </p>
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">Document Preview</p>
              <div className="mt-2 min-h-48 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                {selectedRecord.signedUrl ? (
                  isImageUrl(selectedRecord.signedUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={selectedRecord.documentName}
                      className="h-full w-full object-contain"
                      src={selectedRecord.signedUrl}
                    />
                  ) : isPdfUrl(selectedRecord.signedUrl) ? (
                    <iframe
                      className="h-64 w-full"
                      src={selectedRecord.signedUrl}
                      title={`${selectedRecord.documentName} preview`}
                    />
                  ) : (
                    <div className="p-4 text-xs text-slate-600">
                      Preview unavailable for this file type. Use the link below to open.
                    </div>
                  )
                ) : (
                  <div className="p-4 text-xs text-slate-600">No uploaded file available yet.</div>
                )}
              </div>
              {selectedRecord.signedUrl && (
                <a
                  className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline"
                  href={selectedRecord.signedUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open full document
                </a>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">Document Actions</p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {canVerifyOrReject && (
                  <button
                    className="rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    disabled={savingDocumentId === selectedRecord.id}
                    onClick={() => {
                      void handleTransition(selectedRecord, "verified");
                    }}
                    type="button"
                  >
                    Approve
                  </button>
                )}
                {canVerifyOrReject && (
                  <button
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={savingDocumentId === selectedRecord.id}
                    onClick={() => {
                      void handleTransition(selectedRecord, "rejected");
                    }}
                    type="button"
                  >
                    Reject
                  </button>
                )}
                {canUploadOrUpdate && (
                  <button
                    className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                    disabled={savingDocumentId === selectedRecord.id}
                    onClick={() => {
                      void handleTransition(
                        selectedRecord,
                        "uploaded",
                        "Replacement upload requested and intake status reset to uploaded."
                      );
                    }}
                    type="button"
                  >
                    Upload Replacement
                  </button>
                )}
              </div>
            </section>
          </div>
        </aside>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useCurrentSession } from "@/components/providers/session-provider";
import { canPerformAction } from "@/lib/rbac/permissions";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VERIFICATION_STATUSES,
  type StudentDocumentRecord
} from "@/lib/document-center/types";

type DocumentCenterHubProps = {
  initialRecords: StudentDocumentRecord[];
};

type FilterState = {
  status: "all" | StudentDocumentRecord["status"];
  category: "all" | StudentDocumentRecord["category"];
  studentId: "all" | string;
  classId: "all" | string;
};

type NoticeState = {
  tone: "neutral" | "success" | "error";
  message: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function statusClass(status: StudentDocumentRecord["status"]) {
  if (status === "verified") return "bg-emerald-100 text-emerald-700";
  if (status === "uploaded") return "bg-sky-100 text-sky-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "expired") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function DocumentCenterHub({ initialRecords }: DocumentCenterHubProps) {
  const user = useCurrentSession();
  const canUploadOrUpdate =
    canPerformAction(user.role, "student_document", "create") ||
    canPerformAction(user.role, "student_document", "edit");
  const canVerifyOrReject = canPerformAction(user.role, "student_document", "approve");
  const canSendReminder = canPerformAction(user.role, "communication", "create");
  const canEditExpiry = canUploadOrUpdate || canVerifyOrReject;

  const [records, setRecords] = useState<StudentDocumentRecord[]>(initialRecords);
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    category: "all",
    studentId: "all",
    classId: "all"
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialRecords[0]?.studentId ?? "");
  const [expiryDrafts, setExpiryDrafts] = useState<Record<string, { expiresAt: string; reminderLeadDays: number; reminderEnabled: boolean }>>(
    () =>
      Object.fromEntries(
        initialRecords.map(record => [
          record.id,
          {
            expiresAt: toDateInput(record.expiresAt),
            reminderLeadDays: record.reminderLeadDays,
            reminderEnabled: record.reminderEnabled
          }
        ])
      )
  );
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const classOptions = useMemo(() => {
    const dedup = new Map<string, string>();
    for (const record of records) {
      dedup.set(record.classId, record.className);
    }
    return Array.from(dedup, ([id, name]) => ({ id, name }));
  }, [records]);

  const studentOptions = useMemo(() => {
    const dedup = new Map<string, string>();
    for (const record of records) {
      dedup.set(record.studentId, record.studentName);
    }
    return Array.from(dedup, ([id, name]) => ({ id, name }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filters.status !== "all" && record.status !== filters.status) {
        return false;
      }
      if (filters.category !== "all" && record.category !== filters.category) {
        return false;
      }
      if (filters.studentId !== "all" && record.studentId !== filters.studentId) {
        return false;
      }
      if (filters.classId !== "all" && record.classId !== filters.classId) {
        return false;
      }
      return true;
    });
  }, [filters, records]);

  const selectedStudentRecords = useMemo(
    () => records.filter(record => record.studentId === selectedStudentId),
    [records, selectedStudentId]
  );

  const studentTimeline = useMemo(() => {
    return selectedStudentRecords
      .flatMap(record =>
        record.timeline.map(item => ({
          ...item,
          documentName: record.documentName
        }))
      )
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [selectedStudentRecords]);

  const warningCounts = useMemo(() => {
    const now = Date.now();
    const twentyOneDays = 21 * 24 * 60 * 60 * 1000;
    const missing = records.filter(record => record.status === "missing" || record.status === "rejected").length;
    const expired = records.filter(record => record.status === "expired").length;
    const expiringSoon = records.filter(record => {
      if (!record.expiresAt || (record.status !== "verified" && record.status !== "uploaded")) {
        return false;
      }
      const expiresAt = new Date(record.expiresAt).getTime();
      return expiresAt >= now && expiresAt - now <= twentyOneDays;
    }).length;
    return { missing, expired, expiringSoon };
  }, [records]);

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
      remindersSent?: number;
    };

    if (!response.ok || !payload.success || !payload.records) {
      setNotice({
        tone: "error",
        message: payload.error ?? "Failed to update document center."
      });
      return;
    }

    setRecords(payload.records);
    setSelectedIds(prev => prev.filter(id => payload.records?.some(record => record.id === id)));
    setNotice({
      tone: "success",
      message:
        typeof payload.remindersSent === "number"
          ? `${successMessage} (${payload.remindersSent} reminders logged).`
          : successMessage
    });
  }

  async function handleTransition(documentId: string, targetStatus: StudentDocumentRecord["status"]) {
    setSavingDocumentId(documentId);
    await runAction(
      { action: "transition", documentId, targetStatus },
      `Document moved to ${targetStatus}.`
    );
    setSavingDocumentId(null);
  }

  async function handleSaveExpiry(documentId: string) {
    const draft = expiryDrafts[documentId];
    if (!draft) {
      return;
    }

    setSavingDocumentId(documentId);
    await runAction(
      {
        action: "updateExpiry",
        documentId,
        expiresAt: draft.expiresAt || null,
        reminderLeadDays: draft.reminderLeadDays,
        reminderEnabled: draft.reminderEnabled
      },
      "Expiry schedule saved."
    );
    setSavingDocumentId(null);
  }

  async function handleSendReminders(reminderType: "missing" | "expiry", scoped: boolean) {
    const selectedScopedIds = scoped ? selectedIds : [];
    await runAction(
      { action: "sendReminders", reminderType, documentIds: selectedScopedIds },
      reminderType === "missing" ? "Missing reminders sent." : "Expiry reminders sent."
    );
  }

  function toggleSelection(documentId: string, checked: boolean) {
    setSelectedIds(prev => {
      if (checked) {
        return prev.includes(documentId) ? prev : [...prev, documentId];
      }
      return prev.filter(id => id !== documentId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">Missing or rejected</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{warningCounts.missing}</p>
          {canSendReminder && (
            <button
              className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              onClick={() => {
                void handleSendReminders("missing", false);
              }}
              type="button"
            >
              Send missing reminders
            </button>
          )}
        </article>
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">Expiring in 21 days</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{warningCounts.expiringSoon}</p>
          {canSendReminder && (
            <button
              className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
              onClick={() => {
                void handleSendReminders("expiry", false);
              }}
              type="button"
            >
              Send expiry reminders
            </button>
          )}
        </article>
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">Expired documents</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{warningCounts.expired}</p>
          <p className="mt-3 text-xs text-slate-500">
            Verification lifecycle: missing → uploaded → verified/rejected → expired.
          </p>
        </article>
      </div>

      <article className="admin-content-card space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              onChange={event =>
                setFilters(prev => ({ ...prev, status: event.target.value as FilterState["status"] }))
              }
              value={filters.status}
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
            <span className="font-medium text-slate-700">Category</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              onChange={event =>
                setFilters(prev => ({ ...prev, category: event.target.value as FilterState["category"] }))
              }
              value={filters.category}
            >
              <option value="all">All categories</option>
              {DOCUMENT_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Student</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              onChange={event => setFilters(prev => ({ ...prev, studentId: event.target.value }))}
              value={filters.studentId}
            >
              <option value="all">All students</option>
              {studentOptions.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Class</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              onChange={event => setFilters(prev => ({ ...prev, classId: event.target.value }))}
              value={filters.classId}
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
                : notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            ].join(" ")}
          >
            {notice.message}
          </div>
        )}

        {canSendReminder && selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span>{selectedIds.length} selected</span>
            <button
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-100"
              onClick={() => {
                void handleSendReminders("missing", true);
              }}
              type="button"
            >
              Send missing reminders
            </button>
            <button
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-100"
              onClick={() => {
                void handleSendReminders("expiry", true);
              }}
              type="button"
            >
              Send expiry reminders
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Bulk</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Expiry controls</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const expiryDraft = expiryDrafts[record.id] ?? {
                  expiresAt: "",
                  reminderLeadDays: record.reminderLeadDays,
                  reminderEnabled: record.reminderEnabled
                };
                const saving = savingDocumentId === record.id;

                return (
                  <tr key={record.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <input
                        checked={selectedIds.includes(record.id)}
                        disabled={!canSendReminder}
                        onChange={event => toggleSelection(record.id, event.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        className="text-left text-sm font-semibold text-brand-700 hover:text-brand-900"
                        onClick={() => setSelectedStudentId(record.studentId)}
                        type="button"
                      >
                        {record.studentName}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{record.className}</td>
                    <td className="px-3 py-3">{record.category}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{record.documentName}</p>
                      <p className="text-xs text-slate-500">{record.fileName ?? "Not uploaded yet"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="space-y-2 px-3 py-3">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                        disabled={!canEditExpiry}
                        onChange={event =>
                          setExpiryDrafts(prev => ({
                            ...prev,
                            [record.id]: { ...expiryDraft, expiresAt: event.target.value }
                          }))
                        }
                        type="date"
                        value={expiryDraft.expiresAt}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
                          disabled={!canEditExpiry}
                          min={1}
                          onChange={event =>
                            setExpiryDrafts(prev => ({
                              ...prev,
                              [record.id]: {
                                ...expiryDraft,
                                reminderLeadDays: Math.max(Number(event.target.value) || 1, 1)
                              }
                            }))
                          }
                          type="number"
                          value={expiryDraft.reminderLeadDays}
                        />
                        <span className="text-xs text-slate-500">days lead</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          checked={expiryDraft.reminderEnabled}
                          disabled={!canEditExpiry}
                          onChange={event =>
                            setExpiryDrafts(prev => ({
                              ...prev,
                              [record.id]: { ...expiryDraft, reminderEnabled: event.target.checked }
                            }))
                          }
                          type="checkbox"
                        />
                        Reminder enabled
                      </label>
                      <button
                        className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                        disabled={!canEditExpiry || saving}
                        onClick={() => {
                          void handleSaveExpiry(record.id);
                        }}
                        type="button"
                      >
                        Save expiry
                      </button>
                      <p className="text-xs text-slate-500">Current: {formatDate(record.expiresAt)}</p>
                    </td>
                    <td className="space-y-2 px-3 py-3">
                      {canUploadOrUpdate && (
                        <button
                          className="block w-full rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                          disabled={saving}
                          onClick={() => {
                            void handleTransition(record.id, "uploaded");
                          }}
                          type="button"
                        >
                          Mark uploaded
                        </button>
                      )}
                      {canVerifyOrReject && (
                        <>
                          <button
                            className="block w-full rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            disabled={saving}
                            onClick={() => {
                              void handleTransition(record.id, "verified");
                            }}
                            type="button"
                          >
                            Verify
                          </button>
                          <button
                            className="block w-full rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                            disabled={saving}
                            onClick={() => {
                              void handleTransition(record.id, "rejected");
                            }}
                            type="button"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {!canUploadOrUpdate && !canVerifyOrReject && (
                        <p className="text-xs text-slate-500">Read-only access</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="admin-content-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Student timeline</h2>
            <p className="text-sm text-slate-500">Verification and reminder lifecycle per student.</p>
          </div>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            onChange={event => setSelectedStudentId(event.target.value)}
            value={selectedStudentId}
          >
            {studentOptions.map(student => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {studentTimeline.length === 0 ? (
            <p className="text-sm text-slate-500">No timeline events for this student yet.</p>
          ) : (
            studentTimeline.map(item => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.documentName} • {item.action}
                  </p>
                  <span className="text-xs text-slate-500">{formatDate(item.at)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{item.note}</p>
                <p className="mt-1 text-xs text-slate-500">
                  By {item.actorName} ({item.actorRole})
                  {item.fromStatus && item.toStatus ? ` • ${item.fromStatus} → ${item.toStatus}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  );
}

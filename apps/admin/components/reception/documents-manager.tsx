"use client";

import { useMemo, useState } from "react";
import type {
  StudentDocumentIntakeItem,
  StudentDocumentOverview
} from "@/lib/reception/types";

type Props = {
  initialOverview: StudentDocumentOverview[];
  initialRecords: StudentDocumentIntakeItem[];
  requiredTypes: readonly string[];
};

type DocumentsPayload = {
  success: boolean;
  data?: {
    overview: StudentDocumentOverview[];
    records: StudentDocumentIntakeItem[];
    requiredTypes: readonly string[];
  };
};

export function DocumentsManager({ initialOverview, initialRecords, requiredTypes }: Props) {
  const [overview, setOverview] = useState(initialOverview);
  const [records, setRecords] = useState(initialRecords);
  const [selectedStudentId, setSelectedStudentId] = useState(initialOverview[0]?.studentId ?? "");
  const [documentType, setDocumentType] = useState<string>(requiredTypes[0] ?? "Birth Certificate");
  const [fileName, setFileName] = useState("");
  const [notes, setNotes] = useState("");

  const selectedStudent = useMemo(
    () => overview.find(item => item.studentId === selectedStudentId) ?? null,
    [overview, selectedStudentId]
  );

  async function refresh() {
    const response = await fetch("/api/reception?section=documents");
    const payload = (await response.json()) as DocumentsPayload;
    if (payload.success && payload.data) {
      setOverview(payload.data.overview);
      setRecords(payload.data.records);
    }
  }

  async function intake() {
    if (!selectedStudentId) {
      return;
    }
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "document.intake",
        studentId: selectedStudentId,
        documentType,
        fileName,
        notes
      })
    });
    setFileName("");
    setNotes("");
    await refresh();
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Document Intake Hub</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload, attach, and track required student documents with missing-item alerts.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="admin-content-card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Attach document to student</h2>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={selectedStudentId}
            onChange={event => setSelectedStudentId(event.target.value)}
          >
            <option value="">Select student</option>
            {overview.map(item => (
              <option key={item.studentId} value={item.studentId}>
                {item.studentName} ({item.studentCode})
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={documentType}
            onChange={event => setDocumentType(event.target.value)}
          >
            {requiredTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="File name (e.g. guardian-id.pdf)"
            value={fileName}
            onChange={event => setFileName(event.target.value)}
          />
          <textarea
            className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Notes..."
            value={notes}
            onChange={event => setNotes(event.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            onClick={() => {
              void intake();
            }}
          >
            Save intake
          </button>
        </article>

        <article className="admin-content-card">
          <h2 className="text-lg font-semibold text-slate-900">Missing required documents</h2>
          {!selectedStudent ? (
            <p className="mt-2 text-sm text-slate-500">Select a student to view missing documents.</p>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-slate-800">
                {selectedStudent.studentName} ({selectedStudent.studentCode})
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedStudent.missingDocuments.length === 0 ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    All required documents uploaded
                  </span>
                ) : (
                  selectedStudent.missingDocuments.map(doc => (
                    <span
                      key={doc}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      Missing {doc}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}
        </article>
      </div>

      <article className="admin-content-card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Uploaded/attached records</h2>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Document</th>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {records.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {item.studentName}
                  <p className="text-xs text-slate-500">{item.studentCode}</p>
                </td>
                <td className="px-3 py-2">{item.documentType}</td>
                <td className="px-3 py-2">{item.fileName ?? "—"}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">
                  {item.uploadedAt ? new Date(item.uploadedAt).toLocaleString("en-KE") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

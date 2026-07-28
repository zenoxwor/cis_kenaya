"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReceptionDocumentType = "Passport" | "Birth Certificate" | "ID";

type StudentDocument = {
  id: string | null;
  documentType: ReceptionDocumentType;
  fileName: string | null;
  status: string | null;
  uploadedAt: string | null;
  signedUrl: string | null;
};

type StudentRow = {
  studentId: string;
  displayStudentId: string;
  studentName: string;
  gradeLevel: string;
  documents: StudentDocument[];
};

type ApiPayload = {
  success: boolean;
  data?: {
    students: StudentRow[];
    student?: StudentRow | null;
  };
};

const DOC_TYPES: ReceptionDocumentType[] = ["Passport", "Birth Certificate", "ID"];

export function DocumentsManager() {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});

  const selectedStudent = useMemo(
    () => students.find(item => item.studentId === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const loadStudents = useCallback(async (query: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }
    const response = await fetch(`/api/reception/student-documents?${params.toString()}`);
    const payload = (await response.json()) as ApiPayload;
    if (payload.success && payload.data) {
      setStudents(payload.data.students);
      if (selectedStudentId && payload.data.students.some(item => item.studentId === selectedStudentId)) {
        setSelectedStudentId(selectedStudentId);
      } else {
        setSelectedStudentId(null);
      }
    }
    setLoading(false);
  }, [selectedStudentId]);

  useEffect(() => {
    void loadStudents("");
  }, [loadStudents]);

  async function uploadDocument(documentType: ReceptionDocumentType) {
    if (!selectedStudent) return;
    const key = `${selectedStudent.studentId}:${documentType}`;
    const file = files[key];
    if (!file) return;

    setUploadingKey(key);
    const formData = new FormData();
    formData.append("studentId", selectedStudent.studentId);
    formData.append("documentType", documentType);
    formData.append("file", file);

    const response = await fetch("/api/reception/student-documents", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as ApiPayload;
    if (response.ok && payload.success && payload.data?.student) {
      setStudents(prev =>
        prev.map(item => (item.studentId === payload.data?.student?.studentId ? payload.data.student : item))
      );
      setFiles(prev => ({ ...prev, [key]: null }));
    }
    setUploadingKey(null);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Minimal Student Document Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search students quickly and open full document intake details in a clean side panel.
        </p>
      </header>

      <article className="admin-content-card">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search student name or 3-digit ID..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                void loadStudents(search);
              }
            }}
          />
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => {
              void loadStudents(search);
            }}
          >
            Search
          </button>
        </div>
      </article>

      <article className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Student ID</th>
              <th className="px-3 py-2">Student Name</th>
              <th className="px-3 py-2">Grade Level</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              students.map(student => (
                <tr key={student.studentId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{student.displayStudentId}</td>
                  <td className="px-3 py-2">{student.studentName}</td>
                  <td className="px-3 py-2">{student.gradeLevel}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => setSelectedStudentId(student.studentId)}
                    >
                      View Full Documents 📄
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500">
                  No students matched your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      {selectedStudent && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Student Document Profile</h2>
              <p className="text-sm text-slate-600">{selectedStudent.displayStudentId}</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold hover:bg-slate-50"
              onClick={() => setSelectedStudentId(null)}
            >
              Close
            </button>
          </div>

          <section className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Student:</span> {selectedStudent.studentName}
            </p>
            <p>
              <span className="font-semibold">Student ID:</span> {selectedStudent.displayStudentId}
            </p>
            <p>
              <span className="font-semibold">Grade:</span> {selectedStudent.gradeLevel}
            </p>
          </section>

          <div className="mt-4 space-y-3">
            {DOC_TYPES.map(documentType => {
              const doc =
                selectedStudent.documents.find(item => item.documentType === documentType) ?? null;
              const key = `${selectedStudent.studentId}:${documentType}`;
              return (
                <section key={documentType} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{documentType}</p>
                      <p className="text-xs text-slate-500">
                        {doc?.fileName ?? "No file uploaded"}
                        {doc?.uploadedAt ? ` • ${new Date(doc.uploadedAt).toLocaleString("en-KE")}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {doc?.status ?? "MISSING"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {doc?.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-sky-200 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                      >
                        Preview
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">Preview unavailable</span>
                    )}
                    <input
                      type="file"
                      className="text-xs"
                      onChange={event => {
                        const file = event.target.files?.[0] ?? null;
                        setFiles(prev => ({ ...prev, [key]: file }));
                      }}
                    />
                    <button
                      type="button"
                      className="rounded bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                      disabled={uploadingKey === key || !files[key]}
                      onClick={() => {
                        void uploadDocument(documentType);
                      }}
                    >
                      {uploadingKey === key ? "Uploading..." : "Upload"}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </aside>
      )}
    </section>
  );
}

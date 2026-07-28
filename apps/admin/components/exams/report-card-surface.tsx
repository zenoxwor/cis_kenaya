"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateStudentTermResults,
  EXAM_CLASSES,
  EXAM_STUDENTS,
  EXAM_SUBJECTS,
  EXAM_TERMS,
  gradeFromScore
} from "@/lib/exams/mock-data";
import { createExamRepository } from "@/lib/exams/repository";
import type { ExamModuleState, ReportCard } from "@/lib/exams/types";
import { ROLE, type AppRole } from "@/lib/rbac/roles";
import type { FinanceStatusBadge } from "@/lib/finance/automation";

type ReportCardSurfaceProps = {
  role: AppRole;
  userId: string;
  financeBadgesByAdmissionNo: Record<string, FinanceStatusBadge[]>;
};

export function ReportCardSurface({
  role,
  userId,
  financeBadgesByAdmissionNo
}: ReportCardSurfaceProps) {
  const repository = useMemo(() => createExamRepository(), []);
  const [state, setState] = useState<ExamModuleState>({ marks: [], reportCards: [] });
  const [notice, setNotice] = useState<string | null>(null);
  const [termId, setTermId] = useState(EXAM_TERMS.find(term => term.status === "active")?.id ?? EXAM_TERMS[0].id);
  const [studentId, setStudentId] = useState(EXAM_STUDENTS[0].id);

  useEffect(() => {
    let live = true;
    repository.load().then(data => {
      if (live) {
        setState(data);
      }
    });
    return () => {
      live = false;
    };
  }, [repository]);

  const selectedStudent = EXAM_STUDENTS.find(student => student.id === studentId) ?? EXAM_STUDENTS[0];
  const classStudents = EXAM_STUDENTS.filter(student => student.classId === selectedStudent.classId);
  const termResults = calculateStudentTermResults(termId, state.marks);
  const selectedResult = termResults.find(result => result.studentId === selectedStudent.id);
  const classResults = termResults.filter(result => classStudents.some(student => student.id === result.studentId));
  const ranking = [...classResults].sort((a, b) => b.average - a.average);
  const position = ranking.findIndex(result => result.studentId === selectedStudent.id) + 1;
  const selectedTerm = EXAM_TERMS.find(term => term.id === termId) ?? EXAM_TERMS[0];
  const className = EXAM_CLASSES.find(item => item.id === selectedStudent.classId)?.name ?? "Class";
  const canApprove = role === ROLE.PRINCIPAL || role === ROLE.SUPER_ADMIN;
  const canPublish = role === ROLE.PRINCIPAL || role === ROLE.SUPER_ADMIN;

  const reportCard = state.reportCards.find(
    entry => entry.studentId === selectedStudent.id && entry.termId === selectedTerm.id
  );
  const financeBadges = financeBadgesByAdmissionNo[selectedStudent.admissionNo] ?? [];
  const examHoldActive = financeBadges.some(badge => badge.label === "Exam Hold");

  const financeToneClass: Record<FinanceStatusBadge["tone"], string> = {
    info: "bg-sky-100 text-sky-700 border-sky-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    critical: "bg-red-100 text-red-700 border-red-200"
  };

  function upsertReportCard(nextPartial: Partial<ReportCard>) {
    const existing = reportCard ?? {
      id: `report-${selectedStudent.id}-${selectedTerm.id}`,
      studentId: selectedStudent.id,
      termId: selectedTerm.id,
      status: "draft" as const,
      generatedAt: new Date().toISOString(),
      approvedById: null
    };

    const merged = { ...existing, ...nextPartial };
    setState(prev => ({
      ...prev,
      reportCards: [
        ...prev.reportCards.filter(
          entry => !(entry.studentId === selectedStudent.id && entry.termId === selectedTerm.id)
        ),
        merged
      ]
    }));
    return merged;
  }

  async function persistAndNotify(nextState: ExamModuleState, message: string) {
    await repository.save(nextState);
    setNotice(message);
  }

  async function approveReportCard() {
    if (!canApprove) {
      return;
    }
    const next = upsertReportCard({
      status: "approved",
      approvedById: userId
    });
    const nextState = {
      ...state,
      reportCards: [
        ...state.reportCards.filter(
          entry => !(entry.studentId === selectedStudent.id && entry.termId === selectedTerm.id)
        ),
        next
      ]
    };
    setState(nextState);
    await persistAndNotify(nextState, "Report card approved by principal authority.");
  }

  async function publishReportCard() {
    if (!canPublish) {
      return;
    }
    if (reportCard?.status !== "approved") {
      setNotice("Principal approval is required before publishing.");
      return;
    }
    const next = upsertReportCard({
      status: "published"
    });
    const nextState = {
      ...state,
      reportCards: [
        ...state.reportCards.filter(
          entry => !(entry.studentId === selectedStudent.id && entry.termId === selectedTerm.id)
        ),
        next
      ]
    };
    setState(nextState);
    await persistAndNotify(nextState, "Report card published.");
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card no-print">
        <h1 className="text-2xl font-bold text-slate-900">Report Cards</h1>
        <p className="mt-2 text-sm text-slate-600">
          Generate student term reports with class positions. Principal approval is enforced before publish.
        </p>
      </header>

      <article className="admin-content-card no-print">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Term</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setTermId(event.target.value)}
              value={termId}
            >
              {EXAM_TERMS.map(term => (
                <option key={term.id} value={term.id}>
                  {term.name} {term.year}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Student</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setStudentId(event.target.value)}
              value={studentId}
            >
              {EXAM_STUDENTS.map(student => (
                <option key={student.id} value={student.id}>
                  {student.fullName} ({student.admissionNo})
                </option>
              ))}
            </select>
          </label>
        </div>
      </article>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 no-print">
          {notice}
        </div>
      )}

      {financeBadges.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 no-print">
          <p className="font-semibold">Finance status signals</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {financeBadges.map(badge => (
              <span
                key={`${selectedStudent.id}-${badge.label}`}
                className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${financeToneClass[badge.tone]}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
          {examHoldActive && (
            <p className="mt-2 text-xs font-medium">
              Exam hold notice is active for this student due to arrears threshold.
            </p>
          )}
        </div>
      )}

      <article className="admin-content-card report-card-print-sheet">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Capital International School</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {selectedTerm.name} {selectedTerm.year} Report Card
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Student: <span className="font-semibold text-slate-900">{selectedStudent.fullName}</span> • {selectedStudent.admissionNo}
          </p>
          <p className="text-sm text-slate-600">Class: {className}</p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Mark (%)</th>
                <th className="px-3 py-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {EXAM_SUBJECTS.filter(subject => subject.classId === selectedStudent.classId).map(subject => {
                const result = selectedResult?.subjects.find(item => item.subjectId === subject.id);
                const percentage = result?.percentage ?? 0;
                return (
                  <tr key={subject.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{subject.name}</td>
                    <td className="px-3 py-2">{percentage.toFixed(1)}</td>
                    <td className="px-3 py-2 font-semibold">{result?.grade ?? gradeFromScore(0, 100)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500">Average</p>
            <p className="text-xl font-bold text-slate-900">{(selectedResult?.average ?? 0).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500">Overall Grade</p>
            <p className="text-xl font-bold text-brand-700">{gradeFromScore(selectedResult?.average ?? 0, 100)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-500">Position in Class</p>
            <p className="text-xl font-bold text-slate-900">
              {position > 0 ? `${position} / ${classStudents.length}` : "-"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <p className="text-sm text-slate-600">
            Status: <span className="font-semibold uppercase">{reportCard?.status ?? "draft"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
              onClick={() => window.print()}
              type="button"
            >
              Print report card
            </button>
            <button
              className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canApprove}
              onClick={approveReportCard}
              type="button"
            >
              Principal approve
            </button>
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!canPublish}
              onClick={publishReportCard}
              type="button"
            >
              Publish
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

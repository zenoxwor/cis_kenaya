"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  calculateStudentTermResults,
  EXAM_CLASSES,
  EXAM_COMPONENTS,
  EXAM_STUDENTS,
  EXAM_SUBJECTS,
  EXAM_TERMS
} from "@/lib/exams/mock-data";
import { createExamRepository } from "@/lib/exams/repository";
import type { ExamModuleState } from "@/lib/exams/types";

const defaultState: ExamModuleState = {
  marks: [],
  reportCards: []
};

function statusPill(status: string) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "closed") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-amber-100 text-amber-700";
}

export function ExamsOverview() {
  const repository = useMemo(() => createExamRepository(), []);
  const [state, setState] = useState<ExamModuleState>(defaultState);
  const activeTerm = EXAM_TERMS.find(term => term.status === "active") ?? EXAM_TERMS[0];

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

  const componentsByTerm = useMemo(() => {
    return EXAM_TERMS.map(term => ({
      term,
      components: EXAM_COMPONENTS.filter(component => component.termId === term.id)
    }));
  }, []);

  const analytics = useMemo(() => {
    const termResults = calculateStudentTermResults(activeTerm.id, state.marks);
    const classAverages = EXAM_SUBJECTS.map(subject => {
      const subjectRows = termResults.flatMap(result => result.subjects.filter(entry => entry.subjectId === subject.id));
      const classAverage =
        subjectRows.length > 0
          ? subjectRows.reduce((sum, item) => sum + item.percentage, 0) / subjectRows.length
          : 0;
      return {
        subject: subject.name,
        className: EXAM_CLASSES.find(classRoom => classRoom.id === subject.classId)?.name ?? "Class",
        average: classAverage
      };
    });

    const topPerformers = EXAM_TERMS.map(term => {
      const termStanding = calculateStudentTermResults(term.id, state.marks)
        .map(result => ({
          studentName: EXAM_STUDENTS.find(student => student.id === result.studentId)?.fullName ?? "Student",
          className:
            EXAM_CLASSES.find(
              classRoom => classRoom.id === EXAM_STUDENTS.find(student => student.id === result.studentId)?.classId
            )?.name ?? "Class",
          average: result.average
        }))
        .sort((a, b) => b.average - a.average)[0];

      return {
        termLabel: `${term.name} ${term.year}`,
        studentName: termStanding?.studentName ?? "No marks submitted",
        className: termStanding?.className ?? "-",
        average: termStanding?.average ?? 0
      };
    });

    const failingStudents = termResults
      .filter(result => result.average < 50)
      .map(result => {
        const student = EXAM_STUDENTS.find(item => item.id === result.studentId);
        return {
          studentName: student?.fullName ?? "Student",
          admissionNo: student?.admissionNo ?? "N/A",
          average: result.average
        };
      })
      .sort((a, b) => a.average - b.average);

    return {
      classAverages,
      topPerformers,
      failingStudents
    };
  }, [activeTerm.id, state.marks]);

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">CIS Kenya Assessment Hub</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Exams and Grading</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track terms, manage exam components, submit marks for verification, and publish report cards.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-900" href="/admin/exams/marks">
            Open marks entry
          </Link>
          <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100" href="/admin/exams/reports">
            Open report cards
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {componentsByTerm.map(({ term, components }) => (
          <article key={term.id} className="admin-content-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {term.name} {term.year}
              </h2>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${statusPill(term.status)}`}>
                {term.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {term.startDate} to {term.endDate}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {components.map(component => (
                <li key={component.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>{component.name}</span>
                  <span className="text-xs text-slate-500">
                    {component.weight}% / {component.maxMarks} marks
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="admin-content-card">
          <h2 className="text-lg font-semibold text-slate-900">Class average per subject</h2>
          <p className="mt-1 text-sm text-slate-600">Active term: {activeTerm.name}</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.classAverages.map(item => (
                  <tr key={`${item.className}-${item.subject}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.subject}</td>
                    <td className="px-3 py-2">{item.className}</td>
                    <td className="px-3 py-2">{item.average.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-content-card">
          <h2 className="text-lg font-semibold text-slate-900">Top performers per term</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Term</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topPerformers.map(student => (
                  <tr key={student.termLabel} className="border-t border-slate-100">
                    <td className="px-3 py-2">{student.termLabel}</td>
                    <td className="px-3 py-2">{student.studentName}</td>
                    <td className="px-3 py-2">{student.className}</td>
                    <td className="px-3 py-2 font-semibold text-brand-700">{student.average.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold text-slate-900">Failing students list</h2>
        <p className="mt-1 text-sm text-slate-600">Learners below 50% term average for academic intervention.</p>
        {analytics.failingStudents.length === 0 ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            No students currently below the 50% threshold.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Admission No</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Average</th>
                </tr>
              </thead>
              <tbody>
                {analytics.failingStudents.map(student => (
                  <tr key={student.admissionNo} className="border-t border-slate-100">
                    <td className="px-3 py-2">{student.admissionNo}</td>
                    <td className="px-3 py-2">{student.studentName}</td>
                    <td className="px-3 py-2 font-semibold text-red-700">{student.average.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EXAM_CLASSES,
  EXAM_COMPONENTS,
  EXAM_STUDENTS,
  EXAM_SUBJECTS,
  EXAM_TERMS,
  gradeFromScore
} from "@/lib/exams/mock-data";
import { createExamRepository } from "@/lib/exams/repository";
import type { ExamModuleState, StudentMark } from "@/lib/exams/types";
import { ROLE, type AppRole } from "@/lib/rbac/roles";

type MarksEntryGridProps = {
  role: AppRole;
  userId: string;
};

export function MarksEntryGrid({ role, userId }: MarksEntryGridProps) {
  const repository = useMemo(() => createExamRepository(), []);
  const [state, setState] = useState<ExamModuleState>({ marks: [], reportCards: [] });
  const [termId, setTermId] = useState(EXAM_TERMS.find(term => term.status === "active")?.id ?? EXAM_TERMS[0].id);
  const [classId, setClassId] = useState(EXAM_CLASSES[0].id);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const componentOptions = EXAM_COMPONENTS.filter(component => component.termId === termId);
  const [componentId, setComponentId] = useState(componentOptions[0]?.id ?? "");
  const subjectOptions = EXAM_SUBJECTS.filter(subject => subject.classId === classId);
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");

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

  useEffect(() => {
    const nextComponent = EXAM_COMPONENTS.find(component => component.termId === termId);
    if (nextComponent) {
      setComponentId(nextComponent.id);
    }
  }, [termId]);

  useEffect(() => {
    const nextSubject = EXAM_SUBJECTS.find(subject => subject.classId === classId);
    if (nextSubject) {
      setSubjectId(nextSubject.id);
    }
  }, [classId]);

  const selectedComponent = EXAM_COMPONENTS.find(component => component.id === componentId);
  const classStudents = EXAM_STUDENTS.filter(student => student.classId === classId);
  const canEnterMarks = role === ROLE.TEACHER || role === ROLE.RECEPTION;
  const canVerifyMarks = role === ROLE.PRINCIPAL || role === ROLE.SUPER_ADMIN;

  function upsertMark(studentId: string, value: string) {
    if (!selectedComponent) {
      return;
    }
    const key = `${studentId}-${subjectId}-${componentId}`;
    if (value.trim() === "") {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setState(prev => ({
        ...prev,
        marks: prev.marks.filter(
          mark => !(mark.studentId === studentId && mark.subjectId === subjectId && mark.componentId === componentId)
        )
      }));
      return;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0 || parsed > selectedComponent.maxMarks) {
      setErrors(prev => ({
        ...prev,
        [key]: `Enter a value between 0 and ${selectedComponent.maxMarks}.`
      }));
      return;
    }

    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    setState(prev => {
      const existing = prev.marks.find(
        mark => mark.studentId === studentId && mark.subjectId === subjectId && mark.componentId === componentId
      );
      const nextMarks = prev.marks.filter(
        mark => !(mark.studentId === studentId && mark.subjectId === subjectId && mark.componentId === componentId)
      );
      const nextMark: StudentMark = {
        id: existing?.id ?? `${studentId}-${subjectId}-${componentId}`,
        studentId,
        subjectId,
        componentId,
        rawMark: parsed,
        grade: gradeFromScore(parsed, selectedComponent.maxMarks),
        enteredById: userId,
        verifiedById: existing?.verifiedById ?? null,
        status: existing?.status === "verified" ? "verified" : "draft"
      };
      return {
        ...prev,
        marks: [...nextMarks, nextMark]
      };
    });
  }

  async function persistState(nextState: ExamModuleState, label: string) {
    await repository.save(nextState);
    setNotice(label);
  }

  async function saveDraft() {
    await persistState(state, "Draft marks saved.");
  }

  async function submitForVerification() {
    if (!canEnterMarks) {
      return;
    }
    if (Object.keys(errors).length > 0) {
      setNotice("Fix validation errors before submitting.");
      return;
    }

    const targetStudentIds = new Set(classStudents.map(student => student.id));
    const nextState: ExamModuleState = {
      ...state,
      marks: state.marks.map(mark => {
        if (
          targetStudentIds.has(mark.studentId) &&
          mark.subjectId === subjectId &&
          mark.componentId === componentId
        ) {
          return {
            ...mark,
            status: "submitted"
          };
        }
        return mark;
      })
    };
    setState(nextState);
    await persistState(nextState, "Marks submitted for verification.");
  }

  async function verifyMarks() {
    if (!canVerifyMarks) {
      return;
    }
    const targetStudentIds = new Set(classStudents.map(student => student.id));
    const nextState: ExamModuleState = {
      ...state,
      marks: state.marks.map(mark => {
        if (
          targetStudentIds.has(mark.studentId) &&
          mark.subjectId === subjectId &&
          mark.componentId === componentId &&
          mark.status === "submitted"
        ) {
          return {
            ...mark,
            status: "verified",
            verifiedById: userId
          };
        }
        return mark;
      })
    };
    setState(nextState);
    await persistState(nextState, "Submitted marks verified.");
  }

  function getMark(studentId: string) {
    return (
      state.marks.find(
        mark => mark.studentId === studentId && mark.subjectId === subjectId && mark.componentId === componentId
      ) ?? null
    );
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Marks Entry Grid</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter scores by class, subject, and component. Validation is enforced against component max marks.
        </p>
      </header>

      <article className="admin-content-card space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
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
            <span className="font-medium text-slate-700">Class</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setClassId(event.target.value)}
              value={classId}
            >
              {EXAM_CLASSES.map(classRoom => (
                <option key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Subject</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setSubjectId(event.target.value)}
              value={subjectId}
            >
              {subjectOptions.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Component</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              onChange={event => setComponentId(event.target.value)}
              value={componentId}
            >
              {componentOptions.map(component => (
                <option key={component.id} value={component.id}>
                  {component.name} ({component.maxMarks})
                </option>
              ))}
            </select>
          </label>
        </div>

        {notice && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{notice}</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Admission No</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Raw mark</th>
                <th className="px-3 py-2">Grade</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map(student => {
                const mark = getMark(student.id);
                const key = `${student.id}-${subjectId}-${componentId}`;
                return (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{student.admissionNo}</td>
                    <td className="px-3 py-2">{student.fullName}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded border border-slate-200 px-2 py-1"
                        disabled={!canEnterMarks}
                        max={selectedComponent?.maxMarks ?? 100}
                        min={0}
                        onChange={event => upsertMark(student.id, event.target.value)}
                        type="number"
                        value={mark?.rawMark ?? ""}
                      />
                      {errors[key] && <p className="mt-1 text-xs text-red-700">{errors[key]}</p>}
                    </td>
                    <td className="px-3 py-2 font-semibold text-brand-700">{mark?.grade ?? "-"}</td>
                    <td className="px-3 py-2">{mark?.status ?? "draft"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            onClick={saveDraft}
            type="button"
          >
            Save draft
          </button>
          <button
            className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!canEnterMarks}
            onClick={submitForVerification}
            type="button"
          >
            Submit for verification
          </button>
          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!canVerifyMarks}
            onClick={verifyMarks}
            type="button"
          >
            Verify submitted marks
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Marks entry: Teacher/Reception. Verification: Principal/Super Admin.
        </p>
      </article>
    </section>
  );
}

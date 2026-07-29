"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ReceptionTimetableEntry,
  ReceptionTimetableGradeOption
} from "@/lib/reception/portal-repository";

type Props = {
  gradeOptions: ReceptionTimetableGradeOption[];
};

type TimetablePayload = {
  success: boolean;
  error?: string;
  data?: {
    rows: ReceptionTimetableEntry[];
  };
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

type EditDraft = {
  id: string;
  classId: string;
  dayOfWeek: ReceptionTimetableEntry["dayOfWeek"];
  period: number;
  subject: string;
  teacherName: string;
  startTime: string;
  endTime: string;
};

const DAYS: Array<ReceptionTimetableEntry["dayOfWeek"]> = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<ReceptionTimetableEntry["dayOfWeek"], string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday"
};
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

function labelGrade(gradeLevel: string) {
  return gradeLevel === "Kindergarten" ? "KG" : gradeLevel;
}

export function PrincipalTimetableManagement({ gradeOptions }: Props) {
  const [selectedGrade, setSelectedGrade] = useState(gradeOptions[0]?.gradeLevel ?? "Nursery");
  const [rows, setRows] = useState<ReceptionTimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const [createDraft, setCreateDraft] = useState({
    dayOfWeek: "MON" as ReceptionTimetableEntry["dayOfWeek"],
    period: 1,
    subject: "",
    teacherName: "",
    startTime: "08:00",
    endTime: "08:40"
  });

  const selectedClassId = useMemo(
    () => gradeOptions.find(item => item.gradeLevel === selectedGrade)?.classId ?? null,
    [gradeOptions, selectedGrade]
  );

  const grid = useMemo(() => {
    const map = new Map<string, ReceptionTimetableEntry>();
    for (const row of rows) {
      map.set(`${row.dayOfWeek}-${row.period}`, row);
    }
    return map;
  }, [rows]);

  const requestRows = useCallback(async (method: "GET" | "POST" | "PATCH" | "DELETE", body?: object) => {
    const endpoint = method === "GET" ? `/api/reception/timetables?classId=${selectedClassId}` : "/api/reception/timetables";
    const response = await fetch(endpoint, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = (await response.json()) as TimetablePayload;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "Timetable request failed.");
    }
    return payload.data.rows;
  }, [selectedClassId]);

  const loadRows = useCallback(async () => {
    if (!selectedClassId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const nextRows = await requestRows("GET");
      setRows(nextRows);
    } catch (error) {
      setRows([]);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load timetable entries."
      });
    } finally {
      setLoading(false);
    }
  }, [requestRows, selectedClassId]);

  useEffect(() => {
    setFeedback(null);
    void loadRows();
  }, [loadRows]);

  async function onCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId) {
      setFeedback({ type: "error", message: "No active class is configured for this grade." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const nextRows = await requestRows("POST", {
        classId: selectedClassId,
        dayOfWeek: createDraft.dayOfWeek,
        period: createDraft.period,
        subject: createDraft.subject.trim(),
        teacherName: createDraft.teacherName.trim(),
        startTime: createDraft.startTime,
        endTime: createDraft.endTime
      });
      setRows(nextRows);
      setCreateDraft(previous => ({ ...previous, subject: "", teacherName: "" }));
      setFeedback({ type: "success", message: "Timetable slot saved successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save timetable slot."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteEntry(entry: ReceptionTimetableEntry) {
    if (!selectedClassId || selectedClassId !== entry.classId) {
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const nextRows = await requestRows("DELETE", { id: entry.id, classId: selectedClassId });
      setRows(nextRows);
      setFeedback({ type: "success", message: "Timetable slot removed." });
      if (editDraft?.id === entry.id) {
        setEditDraft(null);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to remove timetable slot."
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDraft || !selectedClassId) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const nextRows = await requestRows("PATCH", {
        id: editDraft.id,
        classId: selectedClassId,
        subject: editDraft.subject.trim(),
        teacherName: editDraft.teacherName.trim(),
        startTime: editDraft.startTime,
        endTime: editDraft.endTime
      });
      setRows(nextRows);
      setEditDraft(null);
      setFeedback({ type: "success", message: "Timetable slot updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update timetable slot."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timetable Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Build and maintain weekly class schedules for Nursery, KG, and Grade 1 to Grade 10.
          </p>
        </div>

        <div className="max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="grade-selector">
            Grade / Class
          </label>
          <select
            id="grade-selector"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={selectedGrade}
            onChange={event => setSelectedGrade(event.target.value as typeof selectedGrade)}
          >
            {gradeOptions.map(option => (
              <option key={option.gradeLevel} value={option.gradeLevel}>
                {labelGrade(option.gradeLevel)}
              </option>
            ))}
          </select>
        </div>

        {feedback ? (
          <p
            className={[
              "rounded-lg px-3 py-2 text-sm",
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            ].join(" ")}
          >
            {feedback.message}
          </p>
        ) : null}
      </header>

      {!selectedClassId ? (
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">
            No active class has been configured for {labelGrade(selectedGrade)} yet.
          </p>
        </article>
      ) : (
        <>
          <form className="admin-content-card grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={onCreateEntry}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="create-day">
                Day
              </label>
              <select
                id="create-day"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createDraft.dayOfWeek}
                onChange={event =>
                  setCreateDraft(previous => ({
                    ...previous,
                    dayOfWeek: event.target.value as ReceptionTimetableEntry["dayOfWeek"]
                  }))
                }
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>
                    {DAY_LABELS[day]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="create-period">
                Period
              </label>
              <select
                id="create-period"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createDraft.period}
                onChange={event =>
                  setCreateDraft(previous => ({
                    ...previous,
                    period: Number(event.target.value)
                  }))
                }
              >
                {PERIODS.map(period => (
                  <option key={period} value={period}>
                    Period {period}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="create-start-time">
                Start time
              </label>
              <input
                id="create-start-time"
                type="time"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createDraft.startTime}
                onChange={event =>
                  setCreateDraft(previous => ({
                    ...previous,
                    startTime: event.target.value
                  }))
                }
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="create-end-time">
                End time
              </label>
              <input
                id="create-end-time"
                type="time"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createDraft.endTime}
                onChange={event =>
                  setCreateDraft(previous => ({
                    ...previous,
                    endTime: event.target.value
                  }))
                }
                required
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="create-subject">
                Subject
              </label>
              <input
                id="create-subject"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createDraft.subject}
                onChange={event =>
                  setCreateDraft(previous => ({
                    ...previous,
                    subject: event.target.value
                  }))
                }
                required
              />
            </div>

            <div className="xl:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="create-teacher">
                Teacher name
              </label>
              <input
                id="create-teacher"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={createDraft.teacherName}
                onChange={event =>
                  setCreateDraft(previous => ({
                    ...previous,
                    teacherName: event.target.value
                  }))
                }
                required
              />
            </div>

            <div className="xl:col-span-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Create / Replace Slot"}
              </button>
            </div>
          </form>

          {loading ? (
            <article className="admin-content-card">
              <p className="text-sm text-slate-600">Loading timetable...</p>
            </article>
          ) : (
            <article className="admin-content-card overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Period</th>
                    {DAYS.map(day => (
                      <th key={day} className="px-3 py-2">
                        {DAY_LABELS[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map(period => (
                    <tr key={period} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-800">{period}</td>
                      {DAYS.map(day => {
                        const entry = grid.get(`${day}-${period}`);
                        return (
                          <td key={`${day}-${period}`} className="px-3 py-2 text-slate-700">
                            {entry ? (
                              <div className="space-y-2 rounded-md border border-slate-200 p-2">
                                <div>
                                  <p className="font-semibold">{entry.subject}</p>
                                  <p className="text-xs text-slate-500">{entry.teacherName}</p>
                                  <p className="text-xs text-slate-500">
                                    {entry.startTime} - {entry.endTime}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    onClick={() => setEditDraft({ ...entry })}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                                    disabled={submitting}
                                    onClick={() => void onDeleteEntry(entry)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}
        </>
      )}

      {editDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl" onSubmit={onUpdateEntry}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit timetable slot</h2>
                <p className="text-sm text-slate-600">
                  {DAY_LABELS[editDraft.dayOfWeek]} · Period {editDraft.period}
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setEditDraft(null)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-subject">
                  Subject
                </label>
                <input
                  id="edit-subject"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={editDraft.subject}
                  onChange={event =>
                    setEditDraft(previous =>
                      previous
                        ? {
                            ...previous,
                            subject: event.target.value
                          }
                        : previous
                    )
                  }
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-teacher">
                  Teacher name
                </label>
                <input
                  id="edit-teacher"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={editDraft.teacherName}
                  onChange={event =>
                    setEditDraft(previous =>
                      previous
                        ? {
                            ...previous,
                            teacherName: event.target.value
                          }
                        : previous
                    )
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-start-time">
                  Start time
                </label>
                <input
                  id="edit-start-time"
                  type="time"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={editDraft.startTime}
                  onChange={event =>
                    setEditDraft(previous =>
                      previous
                        ? {
                            ...previous,
                            startTime: event.target.value
                          }
                        : previous
                    )
                  }
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="edit-end-time">
                  End time
                </label>
                <input
                  id="edit-end-time"
                  type="time"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={editDraft.endTime}
                  onChange={event =>
                    setEditDraft(previous =>
                      previous
                        ? {
                            ...previous,
                            endTime: event.target.value
                          }
                        : previous
                    )
                  }
                  required
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                disabled={submitting}
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() =>
                  void onDeleteEntry({
                    id: editDraft.id,
                    classId: editDraft.classId,
                    dayOfWeek: editDraft.dayOfWeek,
                    period: editDraft.period,
                    subject: editDraft.subject,
                    teacherName: editDraft.teacherName,
                    startTime: editDraft.startTime,
                    endTime: editDraft.endTime
                  })
                }
              >
                Delete slot
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ReceptionTimetableEntry,
  ReceptionTimetableGradeOption
} from "@/lib/reception/portal-repository";
import { getTimetableTextColor } from "@/lib/reception/timetable-colors";

type Props = {
  gradeOptions: ReceptionTimetableGradeOption[];
};

type TimetableResponse = {
  success: boolean;
  data?: {
    rows: ReceptionTimetableEntry[];
  };
};

const DAYS: Array<ReceptionTimetableEntry["dayOfWeek"]> = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS: Record<ReceptionTimetableEntry["dayOfWeek"], string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday"
};
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function TimetablesView({ gradeOptions }: Props) {
  const [selectedGrade, setSelectedGrade] = useState(gradeOptions[0]?.gradeLevel ?? "Nursery");
  const [rows, setRows] = useState<ReceptionTimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedClassId = useMemo(
    () => gradeOptions.find(item => item.gradeLevel === selectedGrade)?.classId ?? null,
    [gradeOptions, selectedGrade]
  );

  useEffect(() => {
    async function load() {
      if (!selectedClassId) {
        setRows([]);
        return;
      }
      setLoading(true);
      const response = await fetch(`/api/reception/timetables?classId=${encodeURIComponent(selectedClassId)}`);
      const payload = (await response.json()) as TimetableResponse;
      if (payload.success && payload.data) {
        setRows(payload.data.rows);
      } else {
        setRows([]);
      }
      setLoading(false);
    }
    void load();
  }, [selectedClassId]);

  const grid = useMemo(() => {
    const map = new Map<string, ReceptionTimetableEntry>();
    for (const row of rows) {
      map.set(`${row.dayOfWeek}-${row.period}`, row);
    }
    return map;
  }, [rows]);

  return (
    <section className="space-y-4">
      <header className="admin-content-card space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Class Timetables</h1>
          <p className="mt-1 text-sm text-slate-600">
            Read-only weekly timetable view for front-desk scheduling support.
          </p>
        </div>
        <div className="max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="grade-selector">
            Grade
          </label>
          <select
            id="grade-selector"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={selectedGrade}
            onChange={event => setSelectedGrade(event.target.value as typeof selectedGrade)}
          >
            {gradeOptions.map(option => (
              <option key={option.gradeLevel} value={option.gradeLevel}>
                {option.gradeLevel}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!selectedClassId ? (
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">
            No timetable set for this grade yet. Contact the Principal to add schedules.
          </p>
        </article>
      ) : loading ? (
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">Loading timetable...</p>
        </article>
      ) : rows.length === 0 ? (
        <article className="admin-content-card">
          <p className="text-sm text-slate-600">
            No timetable set for this grade yet. Contact the Principal to add schedules.
          </p>
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
                    const textColor = entry ? getTimetableTextColor(entry.colorHex) : "#334155";
                    const borderColor = textColor === "#0F172A" ? "#94A3B8" : "#E2E8F0";
                    return (
                      <td key={`${day}-${period}`} className="px-3 py-2 text-slate-700">
                        {entry ? (
                          <div
                            className="rounded-md border p-2"
                            style={{
                              backgroundColor: entry.colorHex,
                              borderColor,
                              color: textColor
                            }}
                          >
                            <p className="font-semibold">{entry.subject}</p>
                            <p className="text-xs" style={{ color: "inherit", opacity: 0.9 }}>
                              {entry.teacherName}
                            </p>
                            <p className="text-xs" style={{ color: "inherit", opacity: 0.9 }}>
                              {entry.startTime} - {entry.endTime}
                            </p>
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
    </section>
  );
}

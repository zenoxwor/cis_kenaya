"use client";

import { useState, useEffect, useCallback } from "react";
import type { AttendanceStatus } from "@/types/auth";
import {
  ATTENDANCE_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  BRAND,
  todayString,
} from "@/lib/attendance";

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: string;
}

interface StudentRow {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  record: { id: string; status: string; notes: string | null } | null;
}

interface Props {
  canMark: boolean;
}

export default function AttendanceCapture({ canMark }: Props) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(todayString());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load classes on mount
  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => {
        setClasses(d.classes ?? []);
        if (d.classes?.length > 0) setSelectedClass(d.classes[0].id);
      })
      .catch(() => setError("Failed to load classes"));
  }, []);

  // Load students when class or date changes
  const loadStudents = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance?classId=${selectedClass}&date=${date}`);
      const data = await res.json();
      const rows: StudentRow[] = data.students ?? [];
      setStudents(rows);
      // Pre-populate statuses from existing records
      const s: Record<string, AttendanceStatus> = {};
      const n: Record<string, string> = {};
      for (const row of rows) {
        s[row.id] = (row.record?.status as AttendanceStatus) ?? "PRESENT";
        n[row.id] = row.record?.notes ?? "";
      }
      setStatuses(s);
      setNotes(n);
    } catch {
      setError("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, date]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const setAllStatus = (status: AttendanceStatus) => {
    const s: Record<string, AttendanceStatus> = {};
    for (const st of students) s[st.id] = status;
    setStatuses(s);
    setSavedAt(null);
  };

  const handleSave = async () => {
    if (!canMark) return;
    setSaving(true);
    setError(null);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? "PRESENT",
        notes: notes[s.id] || undefined,
      }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClass, date, records }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedAt(new Date().toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" }));
    } catch {
      setError("Failed to save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(statuses).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(statuses).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(statuses).filter((s) => s === "LATE").length;
  const excusedCount = Object.values(statuses).filter((s) => s === "EXCUSED").length;

  return (
    <div>
      {/* Controls row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: BRAND.textMuted, fontWeight: 600 }}>CLASS</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={selectStyle}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", color: BRAND.textMuted, fontWeight: 600 }}>DATE</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        {canMark && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setAllStatus("PRESENT")}
              style={{ ...bulkBtn, background: STATUS_COLORS.PRESENT.bg, color: STATUS_COLORS.PRESENT.text, border: `1px solid ${STATUS_COLORS.PRESENT.border}` }}
            >
              All Present
            </button>
            <button
              onClick={() => setAllStatus("ABSENT")}
              style={{ ...bulkBtn, background: STATUS_COLORS.ABSENT.bg, color: STATUS_COLORS.ABSENT.text, border: `1px solid ${STATUS_COLORS.ABSENT.border}` }}
            >
              All Absent
            </button>
          </div>
        )}

        {canMark && (
          <button
            onClick={handleSave}
            disabled={saving || students.length === 0}
            style={{
              ...primaryBtn,
              opacity: saving || students.length === 0 ? 0.6 : 1,
              cursor: saving || students.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Savingâ€¦" : "Save Attendance"}
          </button>
        )}
      </div>

      {/* Summary badges */}
      {students.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map((s) => {
            const count = s === "PRESENT" ? presentCount : s === "ABSENT" ? absentCount : s === "LATE" ? lateCount : excusedCount;
            return (
              <span key={s} style={{ ...badgeStyle, background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].text, border: `1px solid ${STATUS_COLORS[s].border}` }}>
                {count} {STATUS_LABELS[s]}
              </span>
            );
          })}
        </div>
      )}

      {savedAt && (
        <div style={{ color: "#065f46", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 6, padding: "0.5rem 0.75rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          âœ“ Attendance saved at {savedAt}
        </div>
      )}

      {error && (
        <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "0.5rem 0.75rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: BRAND.textMuted }}>Loading studentsâ€¦</p>
      ) : students.length === 0 ? (
        <p style={{ color: BRAND.textMuted }}>No students found for this class.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: BRAND.navyLight, color: "#fff" }}>
                <th style={thStyle}>Student No</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                {canMark && <th style={thStyle}>Notes</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const status = statuses[student.id] ?? "PRESENT";
                const colors = STATUS_COLORS[status];
                return (
                  <tr
                    key={student.id}
                    style={{
                      background: idx % 2 === 0 ? BRAND.white : BRAND.offWhite,
                      borderBottom: `1px solid ${BRAND.border}`,
                    }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: BRAND.textMuted }}>
                        {student.studentCode}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {student.lastName}, {student.firstName}
                    </td>
                    <td style={tdStyle}>
                      {canMark ? (
                        <select
                          value={status}
                          onChange={(e) =>
                            setStatuses((prev) => ({ ...prev, [student.id]: e.target.value as AttendanceStatus }))
                          }
                          style={{
                            ...statusSelect,
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {ATTENDANCE_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ ...badgeStyle, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                          {STATUS_LABELS[status]}
                        </span>
                      )}
                    </td>
                    {canMark && (
                      <td style={tdStyle}>
                        <input
                          type="text"
                          placeholder="Optional noteâ€¦"
                          value={notes[student.id] ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [student.id]: e.target.value }))
                          }
                          style={notesInput}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const selectStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  background: "#fff",
  minWidth: 140,
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  minWidth: 140,
};

const bulkBtn: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  borderRadius: 6,
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.15s",
};

const primaryBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: BRAND.gold,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.2rem 0.6rem",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 700,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 8,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "0.8rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  verticalAlign: "middle",
};

const statusSelect: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  borderRadius: 6,
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 110,
};

const notesInput: React.CSSProperties = {
  padding: "0.3rem 0.5rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 4,
  fontSize: "0.8rem",
  width: "100%",
  maxWidth: 220,
  background: "#fff",
};
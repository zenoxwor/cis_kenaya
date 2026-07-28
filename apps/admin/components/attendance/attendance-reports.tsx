"use client";

import { useState } from "react";
import {
  BRAND,
  STATUS_LABELS,
  STATUS_COLORS,
  todayString,
  AT_RISK_THRESHOLD,
  AT_RISK_WINDOW_DAYS,
} from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/attendance";
import type { FinanceStatusBadge } from "@/lib/finance/automation";

interface ClassOption {
  id: string;
  name: string;
}

interface StudentSummary {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  totalDays: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  recentAbsences: number;
  atRisk: boolean;
}

interface ReportData {
  summaries: StudentSummary[];
  atRiskCount: number;
  meta: {
    startDate: string;
    endDate: string;
    totalStudents: number;
  };
}

interface Props {
  classes: ClassOption[];
  financeBadgesByStudentCode: Record<string, FinanceStatusBadge[]>;
}

export default function AttendanceReports({ classes, financeBadgesByStudentCode }: Props) {
  const today = todayString();
  const sevenDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  })();

  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (classId) params.set("classId", classId);
      const res = await fetch(`/api/attendance/reports?${params}`);
      if (!res.ok) throw new Error("Failed to load report");
      const d = await res.json();
      setData(d);
    } catch {
      setError("Failed to load report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({ startDate, endDate });
    if (classId) params.set("classId", classId);
    window.location.href = `/api/attendance/export?${params}`;
  };

  const summaries = data?.summaries ?? [];
  const filtered = atRiskOnly ? summaries.filter((s) => s.atRisk) : summaries;

  const attendanceRate = (s: StudentSummary) => {
    if (s.totalDays === 0) return "â€”";
    return `${Math.round(((s.present + s.late) / s.totalDays) * 100)}%`;
  };

  const toneClasses: Record<FinanceStatusBadge["tone"], string> = {
    info: "bg-sky-100 text-sky-700 border-sky-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    critical: "bg-red-100 text-red-700 border-red-200"
  };

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
          background: "#fff",
          border: `1px solid ${BRAND.border}`,
          borderRadius: 10,
          padding: "1.25rem",
        }}
      >
        <div style={fieldGroup}>
          <label style={labelStyle}>CLASS</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={selectStyle}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>FROM</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={selectStyle} />
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>TO</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={selectStyle} />
        </div>

        <button onClick={loadReport} disabled={loading} style={primaryBtn}>
          {loading ? "Loadingâ€¦" : "Generate Report"}
        </button>

        {data && (
          <button onClick={handleExport} style={exportBtn}>
            â†“ Export CSV
          </button>
        )}
      </div>

      {error && (
        <div style={errorBox}>{error}</div>
      )}

      {data && (
        <>
          {/* Summary stats */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <StatCard label="Total Students" value={data.meta.totalStudents} />
            <StatCard
              label={`At-Risk (â‰¥${AT_RISK_THRESHOLD} absences / ${AT_RISK_WINDOW_DAYS} days)`}
              value={data.atRiskCount}
              highlight={data.atRiskCount > 0}
            />
          </div>

          {/* At-risk filter toggle */}
          {data.atRiskCount > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", cursor: "pointer", fontSize: "0.875rem" }}>
              <input
                type="checkbox"
                checked={atRiskOnly}
                onChange={(e) => setAtRiskOnly(e.target.checked)}
              />
              Show at-risk students only ({data.atRiskCount})
            </label>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <p style={{ color: BRAND.textMuted }}>No records found for the selected period.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: BRAND.navyLight, color: "#fff" }}>
                    <th style={thStyle}>Student No</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Days Recorded</th>
                    <th style={thStyle}>Present</th>
                    <th style={thStyle}>Late</th>
                    <th style={thStyle}>Absent</th>
                    <th style={thStyle}>Excused</th>
                    <th style={thStyle}>Attendance %</th>
                    <th style={thStyle}>Finance</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => (
                    <tr
                      key={s.studentId}
                      style={{
                        background: s.atRisk
                          ? "#fff7ed"
                          : idx % 2 === 0
                          ? BRAND.white
                          : BRAND.offWhite,
                        borderBottom: `1px solid ${BRAND.border}`,
                        borderLeft: s.atRisk ? `3px solid #f97316` : undefined,
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: BRAND.textMuted }}>
                          {s.studentCode}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>
                        {s.lastName}, {s.firstName}
                      </td>
                      <td style={tdStyle}>{s.className}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{s.totalDays}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <StatusCount count={s.present} status="PRESENT" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <StatusCount count={s.late} status="LATE" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <StatusCount count={s.absent} status="ABSENT" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <StatusCount count={s.excused} status="EXCUSED" />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                        {attendanceRate(s)}
                      </td>
                      <td style={tdStyle}>
                        <div className="flex flex-wrap gap-1">
                          {(financeBadgesByStudentCode[s.studentCode] ?? []).length === 0 ? (
                            <span style={{ color: BRAND.textMuted, fontSize: "0.75rem" }}>
                              Clear
                            </span>
                          ) : (
                            (financeBadgesByStudentCode[s.studentCode] ?? []).map(badge => (
                              <span
                                key={`${s.studentId}-${badge.label}`}
                                className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClasses[badge.tone]}`}
                              >
                                {badge.label}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {s.atRisk ? (
                          <span style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74", borderRadius: 999, padding: "0.2rem 0.6rem", fontSize: "0.7rem", fontWeight: 700 }}>
                            âڑ  At Risk
                          </span>
                        ) : (
                          <span style={{ color: BRAND.textMuted, fontSize: "0.75rem" }}>OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      style={{
        background: highlight ? "#fff7ed" : "#fff",
        border: `1px solid ${highlight ? "#fdba74" : BRAND.border}`,
        borderRadius: 8,
        padding: "0.75rem 1.25rem",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: highlight ? "#c2410c" : BRAND.textDark }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: BRAND.textMuted, marginTop: "0.15rem" }}>{label}</div>
    </div>
  );
}

function StatusCount({ count, status }: { count: number; status: AttendanceStatus }) {
  if (count === 0) return <span style={{ color: BRAND.textMuted }}>0</span>;
  const c = STATUS_COLORS[status];
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 4, padding: "0.1rem 0.4rem", fontSize: "0.8rem", fontWeight: 600 }}>
      {count}
    </span>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.25rem" };

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  color: BRAND.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const selectStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  background: "#fff",
  minWidth: 140,
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
  alignSelf: "flex-end",
};

const exportBtn: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#fff",
  color: BRAND.textDark,
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  cursor: "pointer",
  alignSelf: "flex-end",
};

const errorBox: React.CSSProperties = {
  color: "#991b1b",
  background: "#fee2e2",
  border: "1px solid #fca5a5",
  borderRadius: 6,
  padding: "0.5rem 0.75rem",
  marginBottom: "1rem",
  fontSize: "0.875rem",
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
  fontSize: "0.7rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  verticalAlign: "middle",
};
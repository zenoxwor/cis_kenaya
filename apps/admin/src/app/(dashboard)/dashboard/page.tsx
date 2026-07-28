import { requireRole, canMarkAttendance } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayString, BRAND, AT_RISK_THRESHOLD, AT_RISK_WINDOW_DAYS } from "@/lib/attendance";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — CIS Kenya Admin" };

export default async function DashboardPage() {
  const user = await requireRole("viewer");
  const userCanMark = canMarkAttendance(user.role);

  // Quick stats
  const today = new Date(todayString() + "T00:00:00.000Z");
  const atRiskStart = new Date(today);
  atRiskStart.setDate(atRiskStart.getDate() - AT_RISK_WINDOW_DAYS + 1);

  const [totalStudents, todayRecords, atRiskStudents] = await Promise.all([
    db.student.count({ where: { isActive: true } }),
    db.attendanceRecord.count({ where: { date: today } }),
    db.attendanceRecord.groupBy({
      by: ["studentId"],
      where: {
        status: "ABSENT",
        date: { gte: atRiskStart, lte: today },
      },
      having: { studentId: { _count: { gte: AT_RISK_THRESHOLD } } },
    }),
  ]);

  return (
    <div>
      <h1 style={{ marginTop: 0, color: BRAND.textDark }}>Dashboard</h1>
      <p style={{ color: BRAND.textMuted }}>
        Welcome back, <strong>{user.displayName ?? user.username}</strong>.{" "}
        Signed in as{" "}
        <span style={{ background: BRAND.gold, color: "#fff", padding: "0.1rem 0.45rem", borderRadius: 4, fontSize: "0.8rem", fontWeight: 600 }}>
          {user.role}
        </span>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <StatCard label="Active Students" value={String(totalStudents)} />
        <StatCard label="Marked Today" value={String(todayRecords)} />
        <StatCard label="At-Risk Students" value={String(atRiskStudents.length)} warn={atRiskStudents.length > 0} />
      </div>

      {userCanMark && (
        <div style={{ marginTop: "2rem" }}>
          <a
            href="/attendance"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.5rem",
              background: BRAND.gold,
              color: "#fff",
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            Mark Today's Attendance →
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      style={{
        background: warn ? "#fff7ed" : "#fff",
        borderRadius: 8,
        padding: "1.25rem 1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        border: warn ? "1px solid #fdba74" : "1px solid transparent",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700, color: warn ? "#c2410c" : BRAND.gold }}>{value}</div>
      <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

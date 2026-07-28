import { requireRole } from "@/lib/rbac";
import AttendanceReports from "@/components/attendance-reports";
import type { Metadata } from "next";
import { BRAND } from "@/lib/attendance";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Attendance Reports — CIS Kenya Admin",
};

export default async function AttendanceReportsPage() {
  await requireRole("viewer");

  const classes = await db.schoolClass.findMany({
    where: { isActive: true },
    orderBy: { gradeLevel: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", color: BRAND.textDark }}>
              Attendance Reports
            </h1>
            <p style={{ margin: 0, color: BRAND.textMuted, fontSize: "0.875rem" }}>
              Capital International School — summary by student, class, and date range
            </p>
          </div>
          <a
            href="/attendance"
            style={{
              marginLeft: "auto",
              padding: "0.4rem 0.75rem",
              border: `1px solid ${BRAND.border}`,
              borderRadius: 6,
              fontSize: "0.8rem",
              color: BRAND.textDark,
              textDecoration: "none",
              background: "#fff",
            }}
          >
            ← Mark Attendance
          </a>
        </div>
      </div>

      <AttendanceReports classes={classes} />
    </div>
  );
}

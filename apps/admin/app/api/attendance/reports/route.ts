/**
 * GET /api/attendance/reports
 *   Attendance summary for a date range, grouped by student.
 *   Highlights at-risk students (>= 3 absences in 7 days).
 *   Query: ?classId=&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasMinRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  toDateOnly,
  AT_RISK_THRESHOLD,
  AT_RISK_WINDOW_DAYS,
} from "@/lib/attendance";
import { getDisplayStudentCode } from "@/lib/students/get-display-student-code";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user || !hasMinRole(session.user.role, "viewer")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId") ?? undefined;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  // Fetch all records in date range
  const records = await db.attendanceRecord.findMany({
    where: {
      ...(classId ? { classId } : {}),
      date: { gte: start, lte: end },
    },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          graduationYear: true,
          firstName: true,
          lastName: true
        }
      },
      class: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Compute at-risk window (last 7 days from endDate)
  const atRiskWindowStart = new Date(end);
  atRiskWindowStart.setDate(atRiskWindowStart.getDate() - AT_RISK_WINDOW_DAYS + 1);

  // Group by student
  type StudentSummary = {
    studentId: string;
    rawStudentCode: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    classId: string;
    className: string;
    totalDays: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    recentAbsences: number;
    atRisk: boolean;
  };

  const summaryMap = new Map<string, StudentSummary>();

  for (const r of records) {
    const key = r.studentId;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        studentId: r.student.id,
        rawStudentCode: r.student.studentCode,
        studentCode: getDisplayStudentCode(r.student.studentCode, r.student.graduationYear),
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        classId: r.class.id,
        className: r.class.name,
        totalDays: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        recentAbsences: 0,
        atRisk: false,
      });
    }
    const s = summaryMap.get(key)!;
    s.totalDays++;
    if (r.status === "PRESENT") s.present++;
    else if (r.status === "LATE") s.late++;
    else if (r.status === "ABSENT") s.absent++;
    else if (r.status === "EXCUSED") s.excused++;

    // Count absences in at-risk window
    if (r.status === "ABSENT" && r.date >= atRiskWindowStart) {
      s.recentAbsences++;
    }
  }

  // Set at-risk flag
  for (const s of summaryMap.values()) {
    s.atRisk = s.recentAbsences >= AT_RISK_THRESHOLD;
  }

  const summaries = Array.from(summaryMap.values()).sort((a, b) =>
    a.lastName.localeCompare(b.lastName)
  );

  const atRiskCount = summaries.filter((s) => s.atRisk).length;

  return NextResponse.json({
    summaries,
    atRiskCount,
    meta: {
      startDate,
      endDate,
      totalStudents: summaries.length,
      atRiskThreshold: AT_RISK_THRESHOLD,
      atRiskWindowDays: AT_RISK_WINDOW_DAYS,
    },
  });
}
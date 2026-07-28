/**
 * GET /api/attendance/export
 *   Export attendance records as CSV.
 *   Query: ?classId=&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasMinRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { toDateOnly, STATUS_LABELS } from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/attendance";

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

  const records = await db.attendanceRecord.findMany({
    where: {
      ...(classId ? { classId } : {}),
      date: {
        gte: toDateOnly(startDate),
        lte: toDateOnly(endDate),
      },
    },
    orderBy: [{ date: "asc" }, { class: { name: "asc" } }],
    include: {
      student: { select: { studentNo: true, firstName: true, lastName: true } },
      class: { select: { name: true } },
      markedBy: { select: { displayName: true } },
    },
  });

  // Build CSV
  const rows: string[] = [
    "Date,Class,Student No,Last Name,First Name,Status,Notes,Marked By",
  ];

  for (const r of records) {
    const date = r.date.toISOString().slice(0, 10);
    const statusLabel = STATUS_LABELS[r.status as AttendanceStatus] ?? r.status;
    const notes = (r.notes ?? "").replace(/"/g, '""');
    const markedBy = r.markedBy.displayName.replace(/"/g, '""');
    rows.push(
      `${date},${r.class.name},${r.student.studentNo},"${r.student.lastName}","${r.student.firstName}",${statusLabel},"${notes}","${markedBy}"`
    );
  }

  const csv = rows.join("\n");
  const filename = `attendance_${startDate}_to_${endDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * GET  /api/attendance?classId=&date=YYYY-MM-DD
 *   Returns students in the class with their attendance record for the given date.
 *
 * POST /api/attendance
 *   Body: { classId, date, records: [{ studentId, status, notes? }] }
 *   Upserts attendance records (bulk save).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { hasMinRole, canMarkAttendance } from "@/lib/rbac";
import { db } from "@/lib/db";
import { toDateOnly } from "@/lib/attendance";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user || !hasMinRole(session.user.role, "viewer")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const dateParam = searchParams.get("date");

  if (!classId || !dateParam) {
    return NextResponse.json({ error: "classId and date are required" }, { status: 400 });
  }

  const date = toDateOnly(dateParam);

  const students = await db.student.findMany({
    where: { schoolClassId: classId, isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      studentCode: true,
      firstName: true,
      lastName: true,
      attendanceRecords: {
        where: { date },
        select: { id: true, status: true, notes: true, markedAt: true },
        take: 1,
      },
    },
  });

  const result = students.map((s: (typeof students)[number]) => ({
    id: s.id,
    studentCode: s.studentCode,
    firstName: s.firstName,
    lastName: s.lastName,
    record: s.attendanceRecords[0] ?? null,
  }));

  return NextResponse.json({ students: result });
}

// â”€â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const bulkSaveSchema = z.object({
  classId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
      notes: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user || !canMarkAttendance(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized â€” reception role or higher required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = bulkSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { classId, date: dateStr, records } = parsed.data;
  const date = toDateOnly(dateStr);
  const markedById = session.user.id;

  const upserts = records.map((r: (typeof records)[number]) =>
    db.attendanceRecord.upsert({
      where: { studentId_date: { studentId: r.studentId, date } },
      update: { status: r.status, notes: r.notes ?? null, markedById, markedAt: new Date() },
      create: {
        studentId: r.studentId,
        classId,
        date,
        status: r.status,
        notes: r.notes ?? null,
        markedById,
      },
    })
  );

  const saved = await db.$transaction(upserts);
  return NextResponse.json({ saved: saved.length });
}
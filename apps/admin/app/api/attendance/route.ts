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
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";
import { getDisplayStudentCode } from "@/lib/students/get-display-student-code";

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const ipAddress = req.headers.get("x-forwarded-for");

    if (!session.user || !hasMinRole(session.user.role, "viewer")) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const dateParam = searchParams.get("date");

    if (!classId || !dateParam) {
      throw new AppError("classId and date are required", {
        code: "VALIDATION_ERROR",
        statusCode: 400
      });
    }

    const date = toDateOnly(dateParam);

    const students = await db.student.findMany({
      where: { schoolClassId: classId, isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        studentCode: true,
        graduationYear: true,
        firstName: true,
        lastName: true,
        attendanceRecords: {
          where: { date },
          select: { id: true, status: true, notes: true, markedAt: true },
          take: 1
        }
      }
    });

    const result = students.map((s: (typeof students)[number]) => ({
      id: s.id,
      studentCode: getDisplayStudentCode(s.studentCode, s.graduationYear),
      firstName: s.firstName,
      lastName: s.lastName,
      record: s.attendanceRecords[0] ?? null
    }));

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.displayName ?? null,
        ipAddress
      },
      action: "attendance.list",
      entity: "AttendanceRecord",
      entityId: classId,
      module: "attendance",
      status: "success",
      metadata: { date: dateParam, count: result.length }
    });

    return NextResponse.json({ students: result });
  } catch (error) {
    return routeErrorResponse(error);
  }
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
  try {
    const session = await getSession();
    const ipAddress = req.headers.get("x-forwarded-for");
    if (!session.user || !canMarkAttendance(session.user.role)) {
      logAuditEvent({
        actor: {
          id: session.user?.id ?? null,
          role: session.user?.role ?? null,
          name: session.user?.displayName ?? null,
          ipAddress
        },
        action: "rbac.access_denied",
        entity: "AttendanceRecord",
        entityId: "bulk-upsert",
        module: "rbac",
        status: "denied",
        metadata: { permission: "attendance.mark" }
      });
      throw new AppError("Unauthorized — reception role or higher required", {
        code: "FORBIDDEN",
        statusCode: 403
      });
    }

    const body = await req.json();
    const parsed = bulkSaveSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid attendance payload", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: parsed.error.flatten()
      });
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
          markedById
        }
      })
    );

    const saved = await db.$transaction(upserts);
    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.displayName ?? null,
        ipAddress
      },
      action: "attendance.bulk_upsert",
      entity: "AttendanceRecord",
      entityId: `${classId}:${dateStr}`,
      module: "attendance",
      status: "success",
      metadata: { records: saved.length }
    });

    return NextResponse.json({ saved: saved.length });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
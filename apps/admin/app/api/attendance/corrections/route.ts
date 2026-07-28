/**
 * GET  /api/attendance/corrections
 *   List correction requests. Principals/superadmin see all; others see their own.
 *   Query: ?status=PENDING|APPROVED|REJECTED
 *
 * POST /api/attendance/corrections
 *   Submit a new correction request.
 *   Body: { recordId, reason, newStatus }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { hasMinRole, canApproveCorrections } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";
import { getDisplayStudentCode } from "@/lib/students/get-display-student-code";

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.user || !hasMinRole(session.user.role, "reception")) {
      throw new AppError("Unauthorized", { code: "UNAUTHORIZED", statusCode: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;

    const isApprover = canApproveCorrections(session.user.role);

    const corrections = await db.attendanceCorrection.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(!isApprover ? { requestedById: session.user.id } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        record: {
          include: {
            student: {
              select: { studentCode: true, graduationYear: true, firstName: true, lastName: true }
            },
            class: { select: { name: true } }
          }
        },
        requestedBy: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } }
      }
    });

    const normalizedCorrections = corrections.map(correction => ({
      ...correction,
      record: {
        ...correction.record,
        student: {
          ...correction.record.student,
          studentCode: getDisplayStudentCode(
            correction.record.student.studentCode,
            correction.record.student.graduationYear
          )
        }
      }
    }));

    return NextResponse.json({ corrections: normalizedCorrections });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

// â”€â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createSchema = z.object({
  recordId: z.string().min(1),
  reason: z.string().min(5, "Please provide a reason (at least 5 characters)"),
  newStatus: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const ipAddress = req.headers.get("x-forwarded-for");
    if (!session.user || !hasMinRole(session.user.role, "reception")) {
      throw new AppError("Unauthorized", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid correction payload", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: parsed.error.flatten()
      });
    }

    const { recordId, reason, newStatus } = parsed.data;

    const record = await db.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      throw new AppError("Attendance record not found", { code: "NOT_FOUND", statusCode: 404 });
    }

    if (record.status === newStatus) {
      throw new AppError("New status must differ from current status", {
        code: "VALIDATION_ERROR",
        statusCode: 400
      });
    }

    const correction = await db.attendanceCorrection.create({
      data: {
        recordId,
        requestedById: session.user.id,
        reason,
        originalStatus: record.status,
        newStatus,
        status: "PENDING"
      }
    });

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.displayName ?? null,
        ipAddress
      },
      action: "attendance.correction_request",
      entity: "AttendanceCorrection",
      entityId: correction.id,
      module: "attendance",
      status: "success",
      metadata: { recordId, from: record.status, to: newStatus }
    });

    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
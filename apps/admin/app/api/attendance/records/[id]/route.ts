/**
 * PATCH /api/attendance/records/[id]
 *   Update a single attendance record status (quick edit by authorized staff).
 *   Body: { status, notes? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { canMarkAttendance } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

const patchSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const ipAddress = req.headers.get("x-forwarded-for");
    if (!session.user || !canMarkAttendance(session.user.role)) {
      throw new AppError("Unauthorized", { code: "FORBIDDEN", statusCode: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid attendance patch payload", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: parsed.error.flatten()
      });
    }

    const record = await db.attendanceRecord.update({
      where: { id },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
        markedById: session.user.id
      }
    });

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.displayName ?? null,
        ipAddress
      },
      action: "attendance.update",
      entity: "AttendanceRecord",
      entityId: id,
      module: "attendance",
      status: "success",
      metadata: { status: parsed.data.status }
    });

    return NextResponse.json({ record });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
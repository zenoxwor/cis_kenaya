/**
 * PATCH /api/attendance/corrections/[id]
 *   Approve or reject a correction request.
 *   Body: { action: "approve" | "reject" }
 *   Requires: principal or superadmin role.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { canApproveCorrections } from "@/lib/rbac";
import { prisma as db } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const ipAddress = req.headers.get("x-forwarded-for");
    if (!session.user || !canApproveCorrections(session.user.role)) {
      throw new AppError("Unauthorized — principal role or higher required", {
        code: "FORBIDDEN",
        statusCode: 403
      });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid correction decision payload", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: parsed.error.flatten()
      });
    }

    const correction = await db.attendanceCorrection.findUnique({ where: { id } });
    if (!correction) {
      throw new AppError("Correction not found", { code: "NOT_FOUND", statusCode: 404 });
    }
    if (correction.status !== "PENDING") {
      throw new AppError("Correction already reviewed", { code: "CONFLICT", statusCode: 409 });
    }

    const newStatus = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: newStatus,
          approvedById: session.user!.id,
          reviewedAt: new Date()
        }
      });

      if (newStatus === "APPROVED") {
        await tx.attendanceRecord.update({
          where: { id: correction.recordId },
          data: { status: correction.newStatus, markedById: session.user!.id }
        });
      }
    });

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.displayName ?? null,
        ipAddress
      },
      action: newStatus === "APPROVED" ? "attendance.correction_approve" : "attendance.correction_reject",
      entity: "AttendanceCorrection",
      entityId: id,
      module: "attendance",
      status: "success",
      metadata: {
        recordId: correction.recordId,
        requestedStatus: correction.newStatus
      }
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
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

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user || !canApproveCorrections(session.user.role)) {
    return NextResponse.json(
      { error: "Unauthorized — principal role or higher required" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const correction = await db.attendanceCorrection.findUnique({ where: { id } });
  if (!correction) {
    return NextResponse.json({ error: "Correction not found" }, { status: 404 });
  }
  if (correction.status !== "PENDING") {
    return NextResponse.json({ error: "Correction already reviewed" }, { status: 409 });
  }

  const newStatus = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";

  // If approving, update the attendance record too
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.attendanceCorrection.update({
      where: { id },
      data: {
        status: newStatus,
        approvedById: session.user!.id,
        reviewedAt: new Date(),
      },
    });

    if (newStatus === "APPROVED") {
      await tx.attendanceRecord.update({
        where: { id: correction.recordId },
        data: { status: correction.newStatus, markedById: session.user!.id },
      });
    }
  });

  return NextResponse.json({ success: true, status: newStatus });
}
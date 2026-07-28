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

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user || !hasMinRole(session.user.role, "reception")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const isApprover = canApproveCorrections(session.user.role);

  const corrections = await db.attendanceCorrection.findMany({
    where: {
      ...(status ? { status } : {}),
      // Non-approvers can only see their own requests
      ...(!isApprover ? { requestedById: session.user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      record: {
        include: {
          student: { select: { studentCode: true, firstName: true, lastName: true } },
          class: { select: { name: true } },
        },
      },
      requestedBy: { select: { fullName: true, email: true } },
      approvedBy: { select: { fullName: true, email: true } },
    },
  });

  return NextResponse.json({ corrections });
}

// â”€â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createSchema = z.object({
  recordId: z.string().min(1),
  reason: z.string().min(5, "Please provide a reason (at least 5 characters)"),
  newStatus: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user || !hasMinRole(session.user.role, "reception")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recordId, reason, newStatus } = parsed.data;

  const record = await db.attendanceRecord.findUnique({ where: { id: recordId } });
  if (!record) {
    return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
  }

  if (record.status === newStatus) {
    return NextResponse.json({ error: "New status must differ from current status" }, { status: 400 });
  }

  const correction = await db.attendanceCorrection.create({
    data: {
      recordId,
      requestedById: session.user.id,
      reason,
      originalStatus: record.status,
      newStatus,
      status: "PENDING",
    },
  });

  return NextResponse.json({ correction }, { status: 201 });
}
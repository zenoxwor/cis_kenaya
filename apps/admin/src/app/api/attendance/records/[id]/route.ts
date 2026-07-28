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

const patchSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.user || !canMarkAttendance(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const record = await db.attendanceRecord.update({
    where: { id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      markedById: session.user.id,
    },
  });

  return NextResponse.json({ record });
}

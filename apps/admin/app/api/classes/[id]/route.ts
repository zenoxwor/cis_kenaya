/**
 * PATCH /api/classes/[id] — update a school class (principal+ only)
 * DELETE /api/classes/[id] — soft-delete; blocked if students enrolled
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE } from "@/lib/rbac/roles";
import { db } from "@/lib/db";

function isPrincipalOrAbove(role: string) {
  return role === ROLE.PRINCIPAL || role === ROLE.SUPER_ADMIN;
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gradeLevel: z.string().min(1).max(50).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isActive || !isPrincipalOrAbove(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!data.name && !data.gradeLevel) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const schoolClass = await db.schoolClass.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        campusId: true,
        campus: { select: { name: true } },
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json({ schoolClass });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "A class with this name already exists in this campus." },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isActive || !isPrincipalOrAbove(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const studentCount = await db.student.count({
    where: { schoolClassId: id, isActive: true },
  });

  if (studentCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${studentCount} student${studentCount === 1 ? "" : "s"} enrolled in this class.`,
      },
      { status: 409 }
    );
  }

  try {
    await db.schoolClass.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    throw err;
  }
}

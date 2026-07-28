/**
 * GET  /api/campuses — list all campuses
 * POST /api/campuses — create a campus (principal+ only)
 *
 * Note: Campus.code is required and unique in the schema.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE } from "@/lib/rbac/roles";
import { db } from "@/lib/db";

function isPrincipalOrAbove(role: string) {
  return role === ROLE.PRINCIPAL || role === ROLE.SUPER_ADMIN;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campuses = await db.campus.findMany({
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true, isMain: true },
  });

  return NextResponse.json({ campuses });
}

const createCampusSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isActive || !isPrincipalOrAbove(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createCampusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, code } = parsed.data;

  try {
    const campus = await db.campus.create({
      data: { name, code: code.toUpperCase() },
      select: { id: true, code: true, name: true, isMain: true },
    });
    return NextResponse.json({ campus }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "A campus with this code already exists." },
        { status: 409 }
      );
    }
    throw err;
  }
}

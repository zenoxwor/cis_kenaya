/**
 * GET /api/classes — list active school classes
 * Used by attendance capture to populate the class selector.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasMinRole } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.user || !hasMinRole(session.user.role, "viewer")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classes = await db.schoolClass.findMany({
    where: { isActive: true },
    orderBy: { gradeLevel: "asc" },
    select: { id: true, name: true, gradeLevel: true },
  });

  return NextResponse.json({ classes });
}
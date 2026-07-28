import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import {
  listStaffAttendanceRows,
  markStaffAttendance
} from "@/lib/reception/portal-repository";
import { ROLE } from "@/lib/rbac/roles";

function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function canRead(role: string) {
  return role === ROLE.SUPER_ADMIN || role === ROLE.PRINCIPAL || role === ROLE.RECEPTION;
}

function canWrite(role: string) {
  return role === ROLE.SUPER_ADMIN || role === ROLE.RECEPTION;
}

export async function GET(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    return forbidden();
  }
  if (!canRead(user.role)) {
    return forbidden("Role does not have access to staff attendance.");
  }

  const rows = await listStaffAttendanceRows(user);
  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Only reception and super admin can update staff attendance.");
  }

  const parsed = z
    .object({
      userId: z.string().min(1),
      action: z.enum(["clockIn", "clockOut"])
    })
    .safeParse(await request.json());
  if (!parsed.success) {
    return badRequest("Invalid attendance payload.");
  }

  await markStaffAttendance(user, parsed.data);
  const rows = await listStaffAttendanceRows(user);
  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import {
  createReceptionIncident,
  listTodaysIncidentsByUser
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
    return forbidden("Role does not have incident visibility.");
  }

  const rows = await listTodaysIncidentsByUser(user);
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
    return forbidden("Only reception and super admin can log incidents.");
  }

  const parsed = z
    .object({
      incidentType: z.enum(["Safety", "Complaint", "Maintenance", "Medical", "Other"]),
      personName: z.string().optional(),
      description: z.string().min(4),
      priority: z.enum(["Low", "Medium", "Urgent"])
    })
    .safeParse(await request.json());
  if (!parsed.success) {
    return badRequest("Invalid incident payload.");
  }

  await createReceptionIncident(user, parsed.data);
  const rows = await listTodaysIncidentsByUser(user);

  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

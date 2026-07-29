import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import {
  deleteTimetableEntry,
  listClassTimetable,
  updateTimetableEntry,
  upsertTimetableEntry
} from "@/lib/reception/portal-repository";
import { ROLE, type AppRole } from "@/lib/rbac/roles";

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
  return role === ROLE.SUPER_ADMIN || role === ROLE.PRINCIPAL;
}

function hasTimetablePermission(modulePermissions: string[] | undefined, role: AppRole) {
  return (
    hasModulePermission(modulePermissions, role, "reception_admissions") ||
    hasModulePermission(modulePermissions, role, "principal_dashboard")
  );
}

export async function GET(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasTimetablePermission(user.modulePermissions, user.role)) {
    return forbidden();
  }
  if (!canRead(user.role)) {
    return forbidden("Role does not have timetable visibility.");
  }

  const classId = request.nextUrl.searchParams.get("classId");
  if (!classId) {
    return badRequest("classId is required.");
  }

  const rows = await listClassTimetable(user, classId);
  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasTimetablePermission(user.modulePermissions, user.role)) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Only principal and super admin can edit timetables.");
  }

  const parsed = z
    .object({
      classId: z.string().min(1),
      dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI"]),
      period: z.number().int().min(1).max(8),
      subject: z.string().min(1),
      teacherName: z.string().min(1),
      startTime: z.string().min(1),
      endTime: z.string().min(1)
    })
    .safeParse(await request.json());
  if (!parsed.success) {
    return badRequest("Invalid timetable payload.");
  }

  await upsertTimetableEntry(user, parsed.data);
  const rows = await listClassTimetable(user, parsed.data.classId);
  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

export async function PATCH(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasTimetablePermission(user.modulePermissions, user.role)) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Only principal and super admin can edit timetables.");
  }

  const parsed = z
    .object({
      id: z.string().min(1),
      classId: z.string().min(1),
      subject: z.string().min(1).optional(),
      teacherName: z.string().min(1).optional(),
      startTime: z.string().min(1).optional(),
      endTime: z.string().min(1).optional()
    })
    .safeParse(await request.json());
  if (!parsed.success) {
    return badRequest("Invalid timetable update payload.");
  }

  await updateTimetableEntry(user, {
    id: parsed.data.id,
    subject: parsed.data.subject,
    teacherName: parsed.data.teacherName,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime
  });
  const rows = await listClassTimetable(user, parsed.data.classId);
  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

export async function DELETE(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasTimetablePermission(user.modulePermissions, user.role)) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Only principal and super admin can edit timetables.");
  }

  const parsed = z
    .object({
      id: z.string().min(1),
      classId: z.string().min(1)
    })
    .safeParse(await request.json());
  if (!parsed.success) {
    return badRequest("Invalid timetable delete payload.");
  }

  await deleteTimetableEntry(user, parsed.data.id);
  const rows = await listClassTimetable(user, parsed.data.classId);
  return NextResponse.json({
    success: true,
    data: { rows }
  });
}

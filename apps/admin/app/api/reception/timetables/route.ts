import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import type { SessionUser } from "@/lib/auth/types";
import {
  DEFAULT_TIMETABLE_COLOR_HEX,
  TIMETABLE_COLOR_HEX_REGEX
} from "@/lib/reception/timetable-colors";
import { syncTimetableSnapshotFile } from "@/lib/reception/timetable-snapshot";
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

const TIMETABLE_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

async function syncSnapshotResult(user: SessionUser) {
  try {
    const snapshot = await syncTimetableSnapshotFile(user);
    return { ok: true as const, snapshot };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to sync timetable snapshot."
    };
  }
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
      dayOfWeek: z.enum(TIMETABLE_DAYS),
      period: z.number().int().min(1).max(8),
      subject: z.string().min(1),
      teacherName: z.string().min(1),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      colorHex: z
        .string()
        .regex(TIMETABLE_COLOR_HEX_REGEX, "colorHex must be a #RRGGBB hex color.")
        .transform(value => value.toUpperCase())
        .optional()
        .default(DEFAULT_TIMETABLE_COLOR_HEX)
    })
    .safeParse(await request.json());
  if (!parsed.success) {
    return badRequest("Invalid timetable payload.");
  }

  await upsertTimetableEntry(user, parsed.data);
  const snapshot = await syncSnapshotResult(user);
  const rows = await listClassTimetable(user, parsed.data.classId);
  return NextResponse.json({
    success: true,
    data: { rows, snapshot }
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
      endTime: z.string().min(1).optional(),
      colorHex: z
        .string()
        .regex(TIMETABLE_COLOR_HEX_REGEX, "colorHex must be a #RRGGBB hex color.")
        .transform(value => value.toUpperCase())
        .optional()
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
    endTime: parsed.data.endTime,
    colorHex: parsed.data.colorHex
  });
  const snapshot = await syncSnapshotResult(user);
  const rows = await listClassTimetable(user, parsed.data.classId);
  return NextResponse.json({
    success: true,
    data: { rows, snapshot }
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
  const snapshot = await syncSnapshotResult(user);
  const rows = await listClassTimetable(user, parsed.data.classId);
  return NextResponse.json({
    success: true,
    data: { rows, snapshot }
  });
}

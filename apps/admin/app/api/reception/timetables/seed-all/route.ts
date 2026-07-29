import { NextRequest, NextResponse } from "next/server";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import {
  seedDefaultTimetableForActiveClasses
} from "@/lib/reception/portal-repository";
import { syncTimetableSnapshotFile } from "@/lib/reception/timetable-snapshot";
import { ROLE, type AppRole } from "@/lib/rbac/roles";

function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
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

async function syncSnapshotResult(user: Parameters<typeof seedDefaultTimetableForActiveClasses>[0]) {
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

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasTimetablePermission(user.modulePermissions, user.role)) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Only principal and super admin can bulk-apply timetables.");
  }

  const seedResult = await seedDefaultTimetableForActiveClasses(user);
  const snapshot = await syncSnapshotResult(user);

  return NextResponse.json({
    success: true,
    data: {
      seedResult,
      snapshot
    }
  });
}

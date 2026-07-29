import { NextRequest, NextResponse } from "next/server";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import { syncDailyReportSnapshot } from "@/lib/reception/daily-report-snapshot";
import { ROLE, type AppRole } from "@/lib/rbac/roles";

function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

function canWrite(role: string) {
  return (
    role === ROLE.SUPER_ADMIN ||
    role === ROLE.PRINCIPAL ||
    role === ROLE.RECEPTION ||
    role === ROLE.FINANCE
  );
}

function hasDailyReportPermission(modulePermissions: string[] | undefined, role: AppRole) {
  return (
    hasModulePermission(modulePermissions, role, "reception_admissions") ||
    hasModulePermission(modulePermissions, role, "finance_ops") ||
    hasModulePermission(modulePermissions, role, "principal_dashboard")
  );
}

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasDailyReportPermission(user.modulePermissions, user.role)) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Role does not have permission to save daily reports.");
  }

  try {
    const result = await syncDailyReportSnapshot(user);
    return NextResponse.json({ success: true, data: { result } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save daily report snapshot."
      },
      { status: 500 }
    );
  }
}

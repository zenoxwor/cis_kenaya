import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { ROLE } from "@/lib/rbac/roles";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import type { SessionUser } from "@/lib/auth/types";

export type ApiAuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export function getRequestUser(request: NextRequest): SessionUser | null {
  const rawSession = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return parseSessionPayload(rawSession)?.user ?? null;
}

export function requireRequestUser(request: NextRequest): ApiAuthResult {
  const user = getRequestUser(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 })
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Inactive account" }, { status: 403 })
    };
  }

  return { ok: true, user };
}

export function requireSuperAdminRequestUser(request: NextRequest): ApiAuthResult {
  const auth = requireRequestUser(request);
  if (!auth.ok) {
    return auth;
  }

  if (
    auth.user.role !== ROLE.SUPER_ADMIN ||
    !hasModulePermission(auth.user.modulePermissions, auth.user.role, "super_admin_console")
  ) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    };
  }

  return auth;
}

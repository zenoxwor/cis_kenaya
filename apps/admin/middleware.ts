import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { buildSignInPath } from "@/lib/auth/paths";
import { canAccessRoute } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/observability/audit-stream";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawSession = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);
  const ipAddress = request.headers.get("x-forwarded-for") ?? null;

  if (!session) {
    logAuditEvent({
      actor: { id: null, role: null, name: null, ipAddress },
      action: "auth.session_missing",
      entity: "Route",
      entityId: pathname,
      module: "auth",
      status: "denied",
      metadata: { search }
    });
    const target = `${pathname}${search}`;
    const signInPath = buildSignInPath(target);
    const signInUrl = new URL(signInPath, request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/admin/unauthorized") {
    return NextResponse.next();
  }

  if (!session.user.isActive) {
    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "auth.user_inactive",
      entity: "Route",
      entityId: pathname,
      module: "auth",
      status: "denied",
      metadata: { search }
    });
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  if (!canAccessRoute(session.user.role, pathname, session.user.modulePermissions)) {
    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "rbac.access_denied",
      entity: "Route",
      entityId: pathname,
      module: "rbac",
      status: "denied",
      metadata: { search }
    });
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};

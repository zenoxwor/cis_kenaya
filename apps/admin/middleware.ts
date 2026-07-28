import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { buildSignInPath } from "@/lib/auth/paths";
import { canAccessRoute } from "@/lib/rbac/permissions";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawSession = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);

  if (!session) {
    const target = `${pathname}${search}`;
    const signInPath = buildSignInPath(target);
    const signInUrl = new URL(signInPath, request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname === "/admin/unauthorized") {
    return NextResponse.next();
  }

  if (!canAccessRoute(session.user.role, pathname)) {
    const unauthorizedUrl = new URL("/admin/unauthorized", request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};

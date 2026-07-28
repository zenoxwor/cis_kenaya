/**
 * Next.js Middleware — request-level auth and RBAC enforcement.
 *
 * Runs on the Edge Runtime before any route handler or Server Component.
 *
 * Behaviour:
 *   1. Public paths (/login, /unauthorized, /api/auth/*) are always allowed.
 *   2. Any other /api/* route without a valid session → 401 JSON.
 *   3. Any other route without a valid session → redirect to /login.
 *   4. Routes that match ROUTE_PERMISSIONS → check minimum role; redirect to
 *      /unauthorized if the user's role is insufficient.
 */

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { ROUTE_PERMISSIONS, hasMinRole } from "@/lib/rbac";
import type { AdminSession } from "@/types/auth";
import type { Role } from "@/types/auth";

// Paths that bypass auth entirely
const PUBLIC_PATHS = ["/login", "/unauthorized", "/api/auth/login", "/api/auth/logout"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Find the most-specific matching permission for a given pathname. */
function requiredRoleFor(pathname: string): Role | null {
  // Sort by length descending so more-specific prefixes win
  const sorted = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return ROUTE_PERMISSIONS[prefix];
    }
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Read session from the incoming request using the (req, res, options) API
  // required for Edge Runtime (middleware). We use a temporary Response for
  // read-only checks — session.save() is never called here.
  const res = NextResponse.next();
  const session = await getIronSession<AdminSession>(req, res, getSessionOptions());
  const user = session.user;

  if (!user) {
    // API routes: return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Store the attempted URL so login can redirect back
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC check for route-specific permissions
  const required = requiredRoleFor(pathname);
  if (required && !hasMinRole(user.role, required)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run middleware on all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

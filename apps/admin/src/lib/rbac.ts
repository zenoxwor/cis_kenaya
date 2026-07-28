/**
 * Role-Based Access Control (RBAC) definitions and helpers.
 *
 * Roles (ordered by privilege, highest first):
 *   superadmin – full access; can manage users and all data
 *   admin      – standard admin access; can manage students, run operations
 *   viewer     – read-only access to dashboards and reports
 *
 * Usage in Server Components / Route Handlers:
 *   const user = await requireRole("admin");  // throws redirect if unauthorized
 *
 * Usage in Middleware:
 *   hasMinRole(session.user, "admin")
 */

import { redirect } from "next/navigation";
import type { Role, SessionUser } from "@/types/auth";
import { getSession } from "@/lib/session";

// Role precedence: higher index = more privilege
const ROLE_ORDER: Role[] = ["viewer", "admin", "superadmin"];

/** Returns true if `userRole` meets or exceeds `required`. */
export function hasMinRole(userRole: Role, required: Role): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(required);
}

/** Route-level permission map: path prefix → minimum role required. */
export const ROUTE_PERMISSIONS: Record<string, Role> = {
  "/dashboard": "viewer",
  "/students": "admin",
  "/settings": "superadmin",
};

/**
 * Asserts the current session has at least the given role.
 * Redirects to /login if not authenticated, or /unauthorized if insufficient role.
 *
 * Must be called in a Server Component or Route Handler.
 */
export async function requireRole(minRole: Role): Promise<SessionUser> {
  const session = await getSession();

  if (!session.user) {
    redirect("/login");
  }

  if (!hasMinRole(session.user.role, minRole)) {
    redirect("/unauthorized");
  }

  return session.user;
}

/**
 * Returns the current session user or null (does not throw / redirect).
 * Safe to call in layouts that render both auth'd and unauth'd states.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

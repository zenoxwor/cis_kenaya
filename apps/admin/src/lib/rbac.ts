/**
 * Role-Based Access Control (RBAC) definitions and helpers.
 *
 * Roles (ordered by privilege, highest first):
 *   superadmin  – full access; can manage users and approve corrections
 *   principal   – school principal; can approve corrections and view all reports
 *   admin       – standard admin; can manage students, run operations
 *   reception   – front-desk staff; can mark and view attendance
 *   viewer      – read-only access to dashboards and reports
 *
 * Usage in Server Components / Route Handlers:
 *   const user = await requireRole("reception");  // throws redirect if unauthorized
 *
 * Usage in Middleware:
 *   hasMinRole(session.user, "admin")
 */

import { redirect } from "next/navigation";
import type { Role, SessionUser } from "@/types/auth";
import { getSession } from "@/lib/session";

// Role precedence: higher index = more privilege
const ROLE_ORDER: Role[] = ["viewer", "reception", "admin", "principal", "superadmin"];

/** Returns true if `userRole` meets or exceeds `required`. */
export function hasMinRole(userRole: Role, required: Role): boolean {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(required);
}

/** Returns true if user can mark/edit attendance (reception, admin, principal, superadmin). */
export function canMarkAttendance(role: Role): boolean {
  return hasMinRole(role, "reception");
}

/** Returns true if user can approve attendance corrections (principal, superadmin). */
export function canApproveCorrections(role: Role): boolean {
  return hasMinRole(role, "principal");
}

/** Route-level permission map: path prefix → minimum role required. */
export const ROUTE_PERMISSIONS: Record<string, Role> = {
  "/dashboard": "viewer",
  "/students": "admin",
  "/attendance": "reception",
  "/attendance/reports": "viewer",
  "/settings": "superadmin",
};

/**
 * Asserts the current session has at least the given role.
 * Redirects to /login if not authenticated, or /unauthorized if insufficient role.
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
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

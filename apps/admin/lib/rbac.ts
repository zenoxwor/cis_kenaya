/**
 * RBAC helpers for the attendance module.
 * Provides hasMinRole, canMarkAttendance, canApproveCorrections, requireRole.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { Role, SessionUser } from "@/types/auth";

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

/**
 * Asserts the current session has at least the given role.
 * Redirects to /sign-in if not authenticated, or /admin/unauthorized if insufficient role.
 */
export async function requireRole(minRole: Role): Promise<SessionUser> {
  const session = await getSession();

  if (!session.user) {
    redirect("/sign-in");
  }

  if (!hasMinRole(session.user.role, minRole)) {
    redirect("/admin/unauthorized");
  }

  return session.user;
}

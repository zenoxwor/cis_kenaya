/**
 * Session compatibility shim for the attendance module.
 * Bridges the foundation's cookie-based session to the attendance module's
 * getSession() API that returns { user?: SessionUser }.
 */
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser, AdminSession, Role } from "@/types/auth";
import type { AppRole } from "@/lib/rbac/roles";

/** Map foundation AppRole (uppercase) to attendance Role (lowercase) */
function mapRole(appRole: AppRole): Role {
  const map: Record<AppRole, Role> = {
    SUPER_ADMIN: "superadmin",
    PRINCIPAL: "principal",
    RECEPTION: "reception",
    FINANCE: "admin",
    TEACHER: "reception"  // Teachers can mark attendance
  };
  return map[appRole] ?? "viewer";
}

/**
 * Returns an AdminSession compatible with the attendance module.
 * Wraps the foundation's getCurrentUser().
 */
export async function getSession(): Promise<AdminSession> {
  const foundationUser = await getCurrentUser();
  if (!foundationUser) {
    return { user: undefined };
  }

  const user: SessionUser = {
    id: foundationUser.id,
    username: foundationUser.email,
    displayName: foundationUser.fullName,
    role: mapRole(foundationUser.role),
    createdAt: new Date().toISOString()
  };

  return { user };
}

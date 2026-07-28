import { isAppRole } from "@/lib/rbac/roles";
import type { AuthSessionPayload } from "@/lib/auth/types";
import { normalizePermissions } from "@/lib/rbac/module-permissions";

export function serializeSessionPayload(payload: AuthSessionPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseSessionPayload(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded) as Partial<AuthSessionPayload>;
    if (!parsed || parsed.v !== 1 || !parsed.user) {
      return null;
    }

    const { user } = parsed;
    if (
      typeof user.id !== "string" ||
      typeof user.email !== "string" ||
      typeof user.fullName !== "string" ||
      typeof user.role !== "string" ||
      !isAppRole(user.role)
    ) {
      return null;
    }

    const assignedClassIds = Array.isArray(user.assignedClassIds)
      ? user.assignedClassIds.filter(classId => typeof classId === "string")
      : undefined;

    const permissions = normalizePermissions(user.role, user.permissions);
    const isActive = typeof user.isActive === "boolean" ? user.isActive : true;

    return {
      v: 1 as const,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        permissions,
        isActive,
        assignedClassIds
      }
    };
  } catch (error) {
    console.warn("Invalid auth session cookie payload.", error);
    return null;
  }
}

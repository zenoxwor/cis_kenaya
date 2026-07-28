import type { SessionUser } from "@/lib/auth/types";
import { getVisibleNavigation } from "@/lib/rbac/navigation";

export function getAuthorizedNavigation(user: SessionUser) {
  return getVisibleNavigation(user.role, user.modulePermissions);
}

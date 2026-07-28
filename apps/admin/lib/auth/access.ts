import type { AppRole } from "@/lib/rbac/roles";
import { getVisibleNavigation } from "@/lib/rbac/navigation";

export function getAuthorizedNavigation(role: AppRole) {
  return getVisibleNavigation(role);
}

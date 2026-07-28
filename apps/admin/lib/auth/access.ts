import { getVisibleNavigation } from "@/lib/rbac/navigation";
import type { SessionUser } from "@/lib/auth/types";

export function getAuthorizedNavigation(user: Pick<SessionUser, "role" | "permissions">) {
  return getVisibleNavigation(user);
}

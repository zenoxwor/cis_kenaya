import { getCurrentUser } from "@/lib/auth/session";
import { getVisibleNavigation } from "@/lib/rbac/navigation";

export async function getAuthorizedNavigation() {
  const user = await getCurrentUser();
  return getVisibleNavigation(user.role);
}

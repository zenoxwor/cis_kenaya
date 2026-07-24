import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_NAV_ITEMS } from "@/lib/rbac/navigation";
import { hasPermission } from "@/lib/rbac/permissions";

export async function getAuthorizedNavigation() {
  const user = await getCurrentUser();

  return ADMIN_NAV_ITEMS.filter(
    item =>
      item.roles.includes(user.role) && (!item.permission || hasPermission(user.role, item.permission))
  );
}

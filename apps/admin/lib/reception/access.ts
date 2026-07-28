import { redirect } from "next/navigation";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { ROLE } from "@/lib/rbac/roles";

export async function requireReceptionUser(path: string) {
  const user = await requireCurrentUser(path);
  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    redirect("/admin/unauthorized");
  }
  if (user.role !== ROLE.SUPER_ADMIN && user.role !== ROLE.PRINCIPAL && user.role !== ROLE.RECEPTION) {
    redirect("/admin/unauthorized");
  }
  return user;
}

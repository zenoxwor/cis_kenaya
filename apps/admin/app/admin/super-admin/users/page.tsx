import { redirect } from "next/navigation";
import { UserManagementConsole } from "@/components/super-admin/user-management-console";
import { requireCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/module-permissions";
import { ROLE } from "@/lib/rbac/roles";

export default async function SuperAdminUsersPage() {
  const user = await requireCurrentUser("/admin/super-admin/users");

  if (
    user.role !== ROLE.SUPER_ADMIN ||
    !user.isActive ||
    !hasPermission(user, "super_admin_console")
  ) {
    redirect("/admin/unauthorized");
  }

  return <UserManagementConsole />;
}

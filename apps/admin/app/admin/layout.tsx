import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedNavigation } from "@/lib/auth/access";
import { ROLE_LABELS } from "@/lib/rbac/roles";

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const navItems = await getAuthorizedNavigation();

  return (
    <AdminShell navItems={navItems} roleLabel={ROLE_LABELS[user.role]} userName={user.fullName}>
      {children}
    </AdminShell>
  );
}

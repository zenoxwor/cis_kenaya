import { AdminShell } from "@/components/admin/admin-shell";
import { requireCurrentUser } from "@/lib/auth/session";
import { getAuthorizedNavigation } from "@/lib/auth/access";

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser("/admin");
  const navItems = getAuthorizedNavigation(user.role);

  return (
    <AdminShell navItems={navItems} user={user}>{children}</AdminShell>
  );
}

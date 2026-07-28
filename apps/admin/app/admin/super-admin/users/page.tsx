import Link from "next/link";
import { UserManagementConsole } from "@/components/super-admin/user-management-console";
import { prisma } from "@/lib/db/client";
import { ensureSystemRoles, toManagedUserResponse } from "@/lib/admin/user-management";
import { requireSuperAdminUser } from "@/lib/auth/session";

export default async function SuperAdminUsersPage() {
  await requireSuperAdminUser("/admin/super-admin/users");
  await ensureSystemRoles(prisma);
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: [{ createdAt: "desc" }]
  });

  return (
    <section className="space-y-6">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">User & Role Governance</h1>
        <p className="mt-2 text-slate-600">
          Manage admin identities, module-level permissions, active status, and password resets.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/super-admin/audit">Open audit console →</Link>
          <Link href="/admin/super-admin/settings">Open oversight settings →</Link>
        </div>
      </header>
      <UserManagementConsole initialUsers={users.map(toManagedUserResponse)} />
    </section>
  );
}

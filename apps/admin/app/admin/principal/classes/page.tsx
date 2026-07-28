import { requireCurrentUser } from "@/lib/auth/session";
import { ROLE } from "@/lib/rbac/roles";
import { redirect } from "next/navigation";
import ClassManagement from "@/components/classes/class-management";

export const metadata = { title: "Class Management" };

export default async function ClassesPage() {
  const user = await requireCurrentUser("/admin/principal/classes");

  if (user.role !== ROLE.PRINCIPAL && user.role !== ROLE.SUPER_ADMIN) {
    redirect("/admin/unauthorized");
  }

  return <ClassManagement />;
}

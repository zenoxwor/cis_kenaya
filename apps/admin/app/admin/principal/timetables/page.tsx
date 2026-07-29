import { redirect } from "next/navigation";
import { PrincipalTimetableManagement } from "@/components/principal/timetable-management";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { listTimetableGradeOptions } from "@/lib/reception/portal-repository";
import { ROLE } from "@/lib/rbac/roles";

export default async function PrincipalTimetablesPage() {
  const user = await requireCurrentUser("/admin/principal/timetables");
  const isPrincipalOrSuperAdmin = user.role === ROLE.PRINCIPAL || user.role === ROLE.SUPER_ADMIN;
  const canViewTimetableManagement =
    hasModulePermission(user.modulePermissions, user.role, "principal_dashboard") ||
    hasModulePermission(user.modulePermissions, user.role, "reception_admissions");

  if (!isPrincipalOrSuperAdmin || !canViewTimetableManagement) {
    redirect("/admin/unauthorized");
  }

  const gradeOptions = await listTimetableGradeOptions(user);
  return <PrincipalTimetableManagement gradeOptions={gradeOptions} />;
}

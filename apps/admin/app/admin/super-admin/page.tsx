import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { superAdminDashboardData } from "@/lib/dashboard/super-admin";

export default function SuperAdminPage() {
  return <RoleDashboard data={superAdminDashboardData} />;
}

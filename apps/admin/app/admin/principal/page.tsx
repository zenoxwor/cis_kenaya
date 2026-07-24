import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { principalDashboardData } from "@/lib/dashboard/principal";

export default function PrincipalPage() {
  return <RoleDashboard data={principalDashboardData} />;
}

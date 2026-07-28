import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { receptionDashboardData } from "@/lib/dashboard/reception";

export default function ReceptionPage() {
  return <RoleDashboard data={receptionDashboardData} />;
}

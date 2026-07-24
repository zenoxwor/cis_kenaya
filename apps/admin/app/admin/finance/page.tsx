import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { financeDashboardData } from "@/lib/dashboard/finance";

export default function FinancePage() {
  return <RoleDashboard data={financeDashboardData} />;
}

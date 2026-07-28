import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { getBackupRecoverySnapshot } from "@/lib/backup-recovery/operations";
import { superAdminDashboardData } from "@/lib/dashboard/super-admin";
import type { RoleDashboardData } from "@/lib/dashboard/types";

export default function SuperAdminPage() {
  const snapshot = getBackupRecoverySnapshot();

  const dashboardData: RoleDashboardData = {
    ...superAdminDashboardData,
    shortcuts: [
      {
        label: "Backup & recovery",
        href: "/admin/operations",
        hint: "Run manual backups, review restore drills, and check resilience readiness"
      },
      ...superAdminDashboardData.shortcuts
    ],
    recentActivity: [
      {
        when: snapshot.overview.lastBackupAt
          ? new Date(snapshot.overview.lastBackupAt).toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "N/A",
        title: "Backup resilience status",
        detail: `Latest backup ${snapshot.overview.latestBackupStatus?.toLowerCase() ?? "unknown"}; last successful drill ${snapshot.overview.lastSuccessfulRestoreDrillAt ? "recorded" : "not recorded"}.`,
        status: snapshot.overview.recoveryReadinessStatus === "READY" ? "info" : "warning"
      },
      ...superAdminDashboardData.recentActivity
    ]
  };

  return <RoleDashboard data={dashboardData} />;
}

import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { requireCurrentUser } from "@/lib/auth/session";
import { getBackupRecoverySnapshot } from "@/lib/backup-recovery/operations";
import { principalDashboardData } from "@/lib/dashboard/principal";

export default async function PrincipalPage() {
  await requireCurrentUser("/admin/principal");
  const snapshot = getBackupRecoverySnapshot();

  const dashboardData = {
    ...principalDashboardData,
    shortcuts: [
      {
        label: "Review backup readiness",
        href: "/admin/operations",
        hint: "Read-only visibility into backup history, drills, and recovery posture"
      },
      ...principalDashboardData.shortcuts
    ],
    recentActivity: [
      {
        when: snapshot.overview.lastSuccessfulRestoreDrillAt
          ? new Date(snapshot.overview.lastSuccessfulRestoreDrillAt).toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "N/A",
        title: "Recovery drill visibility",
        detail: `Recovery readiness is ${snapshot.overview.recoveryReadinessStatus.toLowerCase().replace(/_/g, " ")} with export verification ${snapshot.overview.exportVerificationStatus.toLowerCase().replace(/_/g, " ")}.`,
        status: snapshot.overview.recoveryReadinessStatus === "READY" ? ("info" as const) : ("warning" as const)
      },
      ...principalDashboardData.recentActivity
    ]
  } satisfies typeof principalDashboardData;

  return <RoleDashboard data={dashboardData} />;
}

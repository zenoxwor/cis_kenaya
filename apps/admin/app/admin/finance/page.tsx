import { RoleDashboard } from "@/components/dashboard/role-dashboard";
import { financeDashboardData } from "@/lib/dashboard/finance";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { FinanceAutomationPanel } from "@/components/finance/finance-automation-panel";
import {
  evaluateFinanceAutomation,
  getFinanceAutomationSummary,
  listFinanceAutomationOutcomes,
  getFinanceAutomationRules
} from "@/lib/finance/automation";

export default async function FinancePage() {
  const user = await requireCurrentUser("/admin/finance");
  evaluateFinanceAutomation({ id: user.id, role: user.role });
  const summary = getFinanceAutomationSummary();
  const activityStatus: "info" | "warning" =
    summary.criticalCount > 0 ? "warning" : "info";

  const dashboardData = {
    ...financeDashboardData,
    shortcuts: [
      ...financeDashboardData.shortcuts,
      {
        label: "Finance automation panel",
        href: "/admin/finance",
        hint: "Review trigger rules, thresholds, and escalation outcomes"
      }
    ],
    recentActivity: [
      {
        when: summary.lastEvaluatedAt
          ? new Date(summary.lastEvaluatedAt).toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "N/A",
        title: "Finance automation cycle",
        detail: `${summary.actionCount} actions generated from ${summary.totalSignals} monitored student signals.`,
        status: activityStatus
      },
      ...financeDashboardData.recentActivity
    ]
  };

  const canManage = canPerformAction(user.role, "finance_automation", "edit");

  return (
    <section className="space-y-6">
      <RoleDashboard data={dashboardData} />
      <FinanceAutomationPanel
        canManage={canManage}
        initialLastEvaluatedAt={summary.lastEvaluatedAt}
        initialOutcomes={listFinanceAutomationOutcomes(40)}
        initialRules={getFinanceAutomationRules()}
      />
    </section>
  );
}

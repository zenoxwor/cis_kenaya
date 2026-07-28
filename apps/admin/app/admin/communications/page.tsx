import { getCommunicationsStats } from "@/lib/communications/repository";
import { CommunicationsOverview } from "@/components/communications/communications-overview";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import {
  evaluateFinanceAutomation,
  getFinanceAutomationSummary,
  listFinanceAutomationOutcomes
} from "@/lib/finance/automation";

export default async function CommunicationsPage() {
  const user = await requireCurrentUser("/admin/communications");

  if (!canPerformAction(user.role, "communication", "view")) {
    redirect("/admin/unauthorized");
  }

  const stats = getCommunicationsStats();
  evaluateFinanceAutomation({ id: user.id, role: user.role });
  const financeSummary = getFinanceAutomationSummary();
  const financeOutcomes = listFinanceAutomationOutcomes(12);

  return (
    <CommunicationsOverview
      financeOutcomes={financeOutcomes}
      financeSummary={financeSummary}
      role={user.role}
      stats={stats}
    />
  );
}

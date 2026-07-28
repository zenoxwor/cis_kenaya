import { getCommunicationsStats } from "@/lib/communications/repository";
import { CommunicationsOverview } from "@/components/communications/communications-overview";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";

export default async function CommunicationsPage() {
  const user = await requireCurrentUser("/admin/communications");

  if (!canPerformAction(user.role, "communication", "view")) {
    redirect("/admin/unauthorized");
  }

  const stats = getCommunicationsStats();

  return <CommunicationsOverview stats={stats} role={user.role} />;
}

import { listCampaigns, listDeliveries } from "@/lib/communications/repository";
import { DeliveryHistory } from "@/components/communications/delivery-history";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const user = await requireCurrentUser("/admin/communications/history");

  if (!canPerformAction(user.role, "communication", "view")) {
    redirect("/admin/unauthorized");
  }

  const campaigns = listCampaigns();
  const deliveries = listDeliveries();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Delivery History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Full log of all sent messages and delivery status per guardian.
        </p>
      </div>
      <DeliveryHistory campaigns={campaigns} deliveries={deliveries} />
    </section>
  );
}

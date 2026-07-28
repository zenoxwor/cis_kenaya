import { ReceptionDashboard } from "@/components/reception/reception-dashboard";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import { getReceptionDashboard } from "@/lib/reception/repository";

export default async function ReceptionPage() {
  const user = await requireReceptionUser("/admin/reception");
  const dashboard = await getReceptionDashboard(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <ReceptionDashboard initialDashboard={dashboard} />
    </section>
  );
}

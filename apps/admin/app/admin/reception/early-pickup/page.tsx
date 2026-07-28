import { EarlyPickupManager } from "@/components/reception/early-pickup-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import { listEarlyPickups } from "@/lib/reception/repository";

export default async function ReceptionEarlyPickupPage() {
  const user = await requireReceptionUser("/admin/reception/early-pickup");
  const logs = await listEarlyPickups(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <EarlyPickupManager initialLogs={logs} />
    </section>
  );
}

import { LostFoundManager } from "@/components/reception/lost-found-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import { listLostFoundItems } from "@/lib/reception/repository";

export default async function ReceptionLostFoundPage() {
  const user = await requireReceptionUser("/admin/reception/lost-found");
  const items = await listLostFoundItems(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <LostFoundManager initialItems={items} />
    </section>
  );
}

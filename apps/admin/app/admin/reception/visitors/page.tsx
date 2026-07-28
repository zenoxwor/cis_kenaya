import { ReceptionNav } from "@/components/reception/reception-nav";
import { VisitorsManager } from "@/components/reception/visitors-manager";
import { requireReceptionUser } from "@/lib/reception/access";
import { listGatePasses } from "@/lib/reception/repository";

export default async function ReceptionVisitorsPage() {
  const user = await requireReceptionUser("/admin/reception/visitors");
  const passes = await listGatePasses(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <VisitorsManager initialPasses={passes} />
    </section>
  );
}

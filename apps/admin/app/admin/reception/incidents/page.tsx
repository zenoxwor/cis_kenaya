import { IncidentsManager } from "@/components/reception/incidents-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import { listTodaysIncidentsByUser } from "@/lib/reception/portal-repository";

export default async function ReceptionIncidentsPage() {
  const user = await requireReceptionUser("/admin/reception/incidents");
  const incidents = await listTodaysIncidentsByUser(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <IncidentsManager initialRows={incidents} />
    </section>
  );
}

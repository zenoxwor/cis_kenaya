import { IncidentsManager } from "@/components/reception/incidents-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import { listIncidents, listInquiries } from "@/lib/reception/repository";

export default async function ReceptionIncidentsPage() {
  const user = await requireReceptionUser("/admin/reception/incidents");
  const [incidents, inquiries] = await Promise.all([
    listIncidents(user),
    listInquiries(user)
  ]);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <IncidentsManager
        initialIncidents={incidents}
        initialInquiries={inquiries}
      />
    </section>
  );
}

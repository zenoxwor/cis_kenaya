import { AppointmentsManager } from "@/components/reception/appointments-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import { listAppointments } from "@/lib/reception/repository";

export default async function ReceptionAppointmentsPage() {
  const user = await requireReceptionUser("/admin/reception/appointments");
  const appointments = await listAppointments(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <AppointmentsManager initialAppointments={appointments} />
    </section>
  );
}

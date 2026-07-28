import { PreRegistrationsManager } from "@/components/reception/pre-registrations-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";

export default async function ReceptionPreRegistrationsPage() {
  await requireReceptionUser("/admin/reception/pre-registrations");

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <PreRegistrationsManager />
    </section>
  );
}

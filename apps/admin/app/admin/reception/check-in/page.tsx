import { ReceptionNav } from "@/components/reception/reception-nav";
import { StaffCheckinManager } from "@/components/reception/staff-checkin-manager";
import { requireReceptionUser } from "@/lib/reception/access";
import { listStaffCheckIns } from "@/lib/reception/repository";

export default async function ReceptionCheckInPage() {
  const user = await requireReceptionUser("/admin/reception/check-in");
  const data = await listStaffCheckIns(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <StaffCheckinManager
        initialRows={data.rows}
        initialOnSiteCount={data.onSiteCount}
      />
    </section>
  );
}

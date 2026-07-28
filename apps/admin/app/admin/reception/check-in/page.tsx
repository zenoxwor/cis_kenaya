import { ReceptionNav } from "@/components/reception/reception-nav";
import { StaffCheckinManager } from "@/components/reception/staff-checkin-manager";
import { requireReceptionUser } from "@/lib/reception/access";
import { listStaffAttendanceRows } from "@/lib/reception/portal-repository";

export default async function ReceptionCheckInPage() {
  const user = await requireReceptionUser("/admin/reception/check-in");
  const rows = await listStaffAttendanceRows(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <StaffCheckinManager initialRows={rows} />
    </section>
  );
}

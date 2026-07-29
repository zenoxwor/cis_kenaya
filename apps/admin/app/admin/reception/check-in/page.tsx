import { ReceptionNav } from "@/components/reception/reception-nav";
import { StaffCheckinManager } from "@/components/reception/staff-checkin-manager";
import { requireReceptionUser } from "@/lib/reception/access";
import { listDailyReports } from "@/lib/reception/daily-report-snapshot";
import { listStaffAttendanceRows } from "@/lib/reception/portal-repository";

export default async function ReceptionCheckInPage() {
  const user = await requireReceptionUser("/admin/reception/check-in");
  const [rows, savedReports] = await Promise.all([
    listStaffAttendanceRows(user),
    listDailyReports()
  ]);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <StaffCheckinManager initialRows={rows} savedReports={savedReports} />
    </section>
  );
}

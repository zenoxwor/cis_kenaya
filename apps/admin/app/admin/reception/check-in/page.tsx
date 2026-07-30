import { ReceptionNav } from "@/components/reception/reception-nav";
import { StaffCheckinManager } from "@/components/reception/staff-checkin-manager";
import { requireReceptionUser } from "@/lib/reception/access";
import { listStaffAttendanceRows } from "@/lib/reception/portal-repository";
import { listDailyReports } from "@/lib/reception/daily-report-snapshot";

export default async function ReceptionCheckInPage() {
  const user = await requireReceptionUser("/admin/reception/check-in");
  const [rows, reportsResult] = await Promise.all([
    listStaffAttendanceRows(user),
    listDailyReports()
  ]);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <StaffCheckinManager
        initialRows={rows}
        savedReports={reportsResult.reports ?? []}
        savedReportsError={reportsResult.error}
      />
    </section>
  );
}

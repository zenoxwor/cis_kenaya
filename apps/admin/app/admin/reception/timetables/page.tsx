import { ReceptionNav } from "@/components/reception/reception-nav";
import { TimetablesView } from "@/components/reception/timetables-view";
import { requireReceptionUser } from "@/lib/reception/access";
import { listTimetableGradeOptions } from "@/lib/reception/portal-repository";

export default async function ReceptionTimetablesPage() {
  const user = await requireReceptionUser("/admin/reception/timetables");
  const gradeOptions = await listTimetableGradeOptions(user);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <TimetablesView gradeOptions={gradeOptions} />
    </section>
  );
}

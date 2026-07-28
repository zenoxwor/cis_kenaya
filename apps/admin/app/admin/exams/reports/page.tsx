import { ReportCardSurface } from "@/components/exams/report-card-surface";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function ExamsReportsPage() {
  const user = await requireCurrentUser("/admin/exams/reports");
  return <ReportCardSurface role={user.role} userId={user.id} />;
}

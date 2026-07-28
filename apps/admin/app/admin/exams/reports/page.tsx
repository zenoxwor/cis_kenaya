import { ReportCardSurface } from "@/components/exams/report-card-surface";
import { requireCurrentUser } from "@/lib/auth/session";
import { getFinanceBadgesByAdmissionNo } from "@/lib/finance/automation";

export default async function ExamsReportsPage() {
  const user = await requireCurrentUser("/admin/exams/reports");
  return (
    <ReportCardSurface
      financeBadgesByAdmissionNo={getFinanceBadgesByAdmissionNo()}
      role={user.role}
      userId={user.id}
    />
  );
}

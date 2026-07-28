import { ReportSurface } from "@/components/reporting/report-surface";
import { financeReportsData } from "@/lib/reporting/finance-reports";

export default function FinanceReportsPage() {
  return <ReportSurface data={financeReportsData} exportKey="finance-reporting-pack" />;
}

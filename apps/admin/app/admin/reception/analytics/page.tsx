import { ReportSurface } from "@/components/reporting/report-surface";
import { receptionAnalyticsData } from "@/lib/reporting/reception-analytics";

export default function ReceptionAnalyticsPage() {
  return <ReportSurface data={receptionAnalyticsData} exportKey="reception-analytics-report" />;
}

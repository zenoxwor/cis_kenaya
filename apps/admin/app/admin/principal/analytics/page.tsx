import { ReportSurface } from "@/components/reporting/report-surface";
import { principalAnalyticsData } from "@/lib/reporting/principal-analytics";

export default function PrincipalAnalyticsPage() {
  return <ReportSurface data={principalAnalyticsData} exportKey="principal-analytics-report" />;
}

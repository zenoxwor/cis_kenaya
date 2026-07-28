import { ReportSurface } from "@/components/reporting/report-surface";
import { financeReportsData } from "@/lib/reporting/finance-reports";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  evaluateFinanceAutomation,
  listFinanceAutomationOutcomes
} from "@/lib/finance/automation";

export default async function FinanceReportsPage() {
  const user = await requireCurrentUser("/admin/finance/reports");
  evaluateFinanceAutomation({ id: user.id, role: user.role });

  const automationRows = listFinanceAutomationOutcomes(10)
    .slice(0, 6)
    .map(outcome => [
      new Date(outcome.timestamp).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short"
      }),
      outcome.studentName,
      outcome.triggerType,
      outcome.kind,
      outcome.severity,
      outcome.message
    ]);

  const data = {
    ...financeReportsData,
    tables: [
      ...financeReportsData.tables,
      {
        title: "Finance automation outcomes",
        caption:
          "Trigger evaluations and in-app reminder actions linked to attendance, exams, and communications.",
        columns: ["Date", "Student", "Trigger", "Kind", "Severity", "Details"],
        rows:
          automationRows.length > 0
            ? automationRows
            : [["N/A", "N/A", "N/A", "N/A", "INFO", "No automation outcomes available."]]
      }
    ]
  };

  return <ReportSurface data={data} exportKey="finance-reporting-pack" />;
}

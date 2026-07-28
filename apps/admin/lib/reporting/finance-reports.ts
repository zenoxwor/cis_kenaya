import type { ReportSurfaceData } from "@/lib/reporting/types";

export const financeReportsData: ReportSurfaceData = {
  heading: "Finance Reporting",
  subtitle: "Collections, receivables risk, and enrollment-linked revenue flow.",
  metrics: [
    { label: "Collection rate", value: "93.4%", delta: "+1.2% this month", tone: "positive" },
    { label: "Overdue exposure", value: "$84,320", delta: "-6.4%", tone: "positive" },
    { label: "Payment exceptions", value: "4", delta: "2 unresolved", tone: "warning" },
    { label: "Approved pending invoice", value: "16", delta: "Awaiting issue", tone: "neutral" }
  ],
  highlights: [
    "Most overdue balances are concentrated in Grade 10 and Grade 11.",
    "Card payment failures increased after gateway rule update.",
    "Approved-to-invoiced conversion improved after same-day issuance workflow."
  ],
  tables: [
    {
      title: "Receivables aging summary",
      caption: "Invoice distribution by aging bucket.",
      columns: ["Bucket", "Invoice count", "Amount", "Share"],
      rows: [
        ["0-7 days", "48", "$112,540", "46%"],
        ["8-30 days", "27", "$84,320", "34%"],
        ["31+ days", "14", "$49,870", "20%"]
      ]
    },
    {
      title: "Enrollment revenue readiness",
      caption: "Linkage of admissions decisions to finance execution.",
      columns: ["Stage", "Count", "Revenue estimate", "Lag risk"],
      rows: [
        ["Approved / no invoice", "16", "$39,600", "Medium"],
        ["Issued / unpaid", "22", "$58,100", "High"],
        ["Settled / ready for enrollment", "31", "$81,200", "Low"]
      ]
    }
  ]
};

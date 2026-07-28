import type { RoleDashboardData } from "@/lib/dashboard/types";

export const financeDashboardData: RoleDashboardData = {
  heading: "Finance Operations",
  subtitle: "Revenue assurance, invoice lifecycle, and payment reconciliation.",
  kpis: [
    { label: "Outstanding balance", value: "$84,320", trend: "-6.4% this month", tone: "positive" },
    { label: "Overdue invoices", value: "37", trend: "11 critical", tone: "warning" },
    { label: "Payments posted today", value: "54", trend: "$19,240 received", tone: "positive" },
    { label: "Reconciliation gaps", value: "4", trend: "2 pending review", tone: "warning" }
  ],
  shortcuts: [
    { label: "Invoice management", href: "/admin/finance/invoices", hint: "Issue and update student invoices" },
    { label: "Payment operations", href: "/admin/finance/payments", hint: "Post and reconcile payments" },
    { label: "Finance reporting pack", href: "/admin/finance/reports", hint: "Export-ready analytics and trends" },
    { label: "Admissions linkage", href: "/admin/reception/applications", hint: "Verify payment prerequisites" }
  ],
  recentActivity: [
    {
      when: "10:15",
      title: "Batch reconciliation completed",
      detail: "Bank feed batch-247 closed with 1 unresolved entry.",
      status: "success"
    },
    {
      when: "09:47",
      title: "Payment reversal request",
      detail: "INV-2026-441 flagged for manual verification.",
      status: "warning"
    },
    {
      when: "09:05",
      title: "Monthly export issued",
      detail: "Revenue summary exported for principal briefing.",
      status: "info"
    }
  ],
  tables: [
    {
      title: "Invoice aging board",
      caption: "Outstanding invoices by aging bucket.",
      columns: ["Invoice", "Student", "Amount", "Due date", "Aging bucket"],
      rows: [
        ["INV-2026-441", "Lina Shadid", "$2,450", "2026-07-10", "15-30 days"],
        ["INV-2026-404", "Karim Salem", "$3,120", "2026-06-28", "30+ days"],
        ["INV-2026-392", "Mira Al-Rashid", "$1,980", "2026-07-21", "0-7 days"]
      ]
    },
    {
      title: "Payment exception queue",
      caption: "Transactions needing manual finance action.",
      columns: ["Payment ref", "Method", "Status", "Amount", "Next action"],
      rows: [
        ["PAY-778320", "Bank transfer", "PENDING", "$1,200", "Verify receipt image"],
        ["PAY-778108", "Card", "FAILED", "$840", "Contact guardian"],
        ["PAY-777992", "Cash desk", "REVERSED", "$600", "Supervisor approval"]
      ]
    }
  ]
};

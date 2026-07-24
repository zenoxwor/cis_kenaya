import type { RoleDashboardData } from "@/lib/dashboard/types";

export const principalDashboardData: RoleDashboardData = {
  heading: "Principal Dashboard",
  subtitle: "Executive view of academics, admissions readiness, and school operations.",
  kpis: [
    { label: "Enrolled students", value: "642", trend: "+18 this term", tone: "positive" },
    { label: "Applications pending decision", value: "21", trend: "6 due today", tone: "warning" },
    { label: "Attendance rate", value: "96.2%", trend: "+0.8% week over week", tone: "positive" },
    { label: "Document verification completion", value: "88%", trend: "Target 92%", tone: "neutral" }
  ],
  shortcuts: [
    { label: "Open decision workflow", href: "/admin/principal/reports", hint: "Review and approve admissions" },
    { label: "Open analytics center", href: "/admin/principal/analytics", hint: "Cross-functional school analytics" },
    { label: "Review applications", href: "/admin/reception/applications", hint: "Approve pending candidates" },
    { label: "Check finance exposure", href: "/admin/finance/reports", hint: "Tuition collection and risk" }
  ],
  recentActivity: [
    {
      when: "10:05",
      title: "Admissions decision posted",
      detail: "12 applications moved to APPROVED after committee review.",
      status: "success"
    },
    {
      when: "09:40",
      title: "Operational alert",
      detail: "Grade 9 document completion dropped below target threshold.",
      status: "warning"
    },
    {
      when: "08:50",
      title: "Performance snapshot generated",
      detail: "Weekly attendance report exported for board update.",
      status: "info"
    }
  ],
  tables: [
    {
      title: "Admissions decision board",
      caption: "Applications requiring principal oversight this cycle.",
      columns: ["Application", "Applicant", "Applied grade", "Current status", "Decision due"],
      rows: [
        ["APP-20260724-0910-441", "Lina Shadid", "Grade 8", "UNDER_REVIEW", "Today"],
        ["APP-20260724-0820-318", "Karim Salem", "Grade 10", "INTERVIEW_SCHEDULED", "Tomorrow"],
        ["APP-20260723-1645-776", "Mira Al-Rashid", "Grade 7", "DOCUMENTS_PENDING", "2 days"]
      ]
    },
    {
      title: "Academic quality indicators",
      caption: "Core operational metrics by section.",
      columns: ["Section", "Attendance", "Behavior incidents", "Assessment completion", "Trend"],
      rows: [
        ["Primary", "97.4%", "3", "95%", "Improving"],
        ["Middle", "95.8%", "7", "93%", "Stable"],
        ["Secondary", "94.9%", "9", "91%", "Watch"]
      ]
    }
  ]
};

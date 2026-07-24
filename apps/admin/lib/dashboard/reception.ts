import type { RoleDashboardData } from "@/lib/dashboard/types";

export const receptionDashboardData: RoleDashboardData = {
  heading: "Reception & Admissions",
  subtitle: "Front-office intake operations for inquiries, applications, and documents.",
  kpis: [
    { label: "New inquiries (today)", value: "14", trend: "+3 vs yesterday", tone: "neutral" },
    { label: "Draft registrations", value: "19", trend: "8 at step 5+", tone: "warning" },
    { label: "Applications submitted", value: "11", trend: "92% completion rate", tone: "positive" },
    { label: "Visitor check-ins", value: "27", trend: "5 interview guests pending", tone: "neutral" }
  ],
  shortcuts: [
    { label: "Applications queue", href: "/admin/reception/applications", hint: "Triage and escalation board" },
    { label: "Start registration wizard", href: "/admin/registration", hint: "Create new applicant draft" },
    { label: "Reception analytics", href: "/admin/reception/analytics", hint: "Track intake performance trends" },
    { label: "Principal decisions", href: "/admin/principal/reports", hint: "Follow up decision bottlenecks" }
  ],
  recentActivity: [
    {
      when: "10:20",
      title: "New draft opened",
      detail: "Draft APP-20260724-1020-902 created for Grade 7 intake.",
      status: "info"
    },
    {
      when: "09:58",
      title: "Document completed",
      detail: "Guardian ID verified for APP-20260724-0910-441.",
      status: "success"
    },
    {
      when: "09:15",
      title: "Interview scheduling delay",
      detail: "2 candidates waiting for panel availability.",
      status: "warning"
    }
  ],
  tables: [
    {
      title: "Daily admissions pipeline",
      caption: "Queue state for active applicant records.",
      columns: ["Application", "Student", "Step", "Document status", "Owner"],
      rows: [
        ["APP-20260724-1020-902", "Noor Khaled", "Step 2", "PENDING", "reception@kenaya.local"],
        ["APP-20260724-0910-441", "Lina Shadid", "Step 6", "VERIFIED", "reception@kenaya.local"],
        ["APP-20260724-0820-318", "Karim Salem", "Step 5", "UPLOADED", "admissions.officer@kenaya.local"]
      ]
    },
    {
      title: "Visitor log snapshot",
      caption: "Reception desk physical visitor movement.",
      columns: ["Visitor", "Purpose", "Host department", "Check-in", "Check-out"],
      rows: [
        ["Rami Haddad", "Application interview", "Admissions", "09:05", "—"],
        ["Sara Jaber", "Document submission", "Reception", "09:42", "10:01"],
        ["Yousef Nasser", "Fee inquiry", "Finance", "10:00", "—"]
      ]
    }
  ]
};

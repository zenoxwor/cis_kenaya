import type { ReportSurfaceData } from "@/lib/reporting/types";

export const principalAnalyticsData: ReportSurfaceData = {
  heading: "Principal Analytics",
  subtitle: "School-level outcomes across enrollment quality, admissions funnel, and risk indicators.",
  metrics: [
    { label: "Approval conversion", value: "71%", delta: "+4% this cycle", tone: "positive" },
    { label: "Avg review turnaround", value: "1.8 days", delta: "-0.3 days", tone: "positive" },
    { label: "Document completion", value: "88%", delta: "Target 92%", tone: "warning" },
    { label: "Projected intake", value: "164", delta: "12 waitlisted", tone: "neutral" }
  ],
  highlights: [
    "Grade 8 intake exceeds target by 6 applicants.",
    "Interview scheduling delay concentrated on Tuesdays.",
    "Document rejection trend linked to report-card upload quality."
  ],
  tables: [
    {
      title: "Admissions funnel by stage",
      caption: "Current academic cycle applicant progression.",
      columns: ["Stage", "Count", "Conversion", "Trend"],
      rows: [
        ["Submitted", "196", "100%", "Stable"],
        ["Under review", "94", "48%", "Up"],
        ["Approved", "139", "71%", "Up"],
        ["Enrolled", "121", "62%", "Stable"]
      ]
    },
    {
      title: "Decision SLA tracker",
      caption: "Applications breaching or nearing review deadlines.",
      columns: ["Application", "Owner", "Current status", "Age", "SLA risk"],
      rows: [
        ["APP-20260724-0820-318", "Admissions Officer", "DOCUMENTS_PENDING", "2.1 days", "Medium"],
        ["APP-20260724-0910-441", "Admissions Officer", "UNDER_REVIEW", "1.4 days", "Low"],
        ["APP-20260723-1511-990", "Reception Team", "INTERVIEW_SCHEDULED", "3.0 days", "High"]
      ]
    }
  ]
};

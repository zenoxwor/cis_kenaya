import type { ReportSurfaceData } from "@/lib/reporting/types";

export const receptionAnalyticsData: ReportSurfaceData = {
  heading: "Reception & Admissions Analytics",
  subtitle: "Intake execution metrics covering inquiry handling, documents, and conversion readiness.",
  metrics: [
    { label: "New inquiries (7d)", value: "82", delta: "+9 vs prior week", tone: "positive" },
    { label: "Draft abandonment", value: "13%", delta: "-2%", tone: "positive" },
    { label: "Doc verification turnaround", value: "14h", delta: "+3h bottleneck", tone: "warning" },
    { label: "Interview-ready records", value: "29", delta: "5 pending docs", tone: "neutral" }
  ],
  highlights: [
    "Most incomplete drafts drop off at guardian contact step.",
    "Birth certificate uploads have the highest rejection rate.",
    "Morning shift closes applications faster than afternoon shift."
  ],
  tables: [
    {
      title: "Step completion performance",
      caption: "Average completion rates across wizard stages.",
      columns: ["Step", "Completion rate", "Avg time", "Primary issue"],
      rows: [
        ["Student profile", "96%", "6m", "Name transliteration checks"],
        ["Guardian contacts", "89%", "9m", "Missing emergency number"],
        ["Academic placement", "84%", "7m", "Grade mismatch"],
        ["Documents upload", "73%", "12m", "Unreadable attachments"]
      ]
    },
    {
      title: "Intake agent throughput",
      caption: "Daily admissions handling by front-office team.",
      columns: ["Agent", "Drafts created", "Submitted", "Escalations", "Conversion"],
      rows: [
        ["Admissions Officer", "12", "9", "2", "75%"],
        ["Reception Lead", "10", "8", "1", "80%"],
        ["Front Desk Clerk", "8", "5", "3", "62%"]
      ]
    }
  ]
};

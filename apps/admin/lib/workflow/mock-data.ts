import type { WorkflowApplicationRecord } from "@/lib/workflow/types";

export const seedWorkflowRecords: WorkflowApplicationRecord[] = [
  {
    id: "wf-001",
    applicationNo: "APP-20260724-0910-441",
    studentName: "Lina Shadid",
    appliedGrade: "Grade 8",
    ownerName: "Admissions Officer",
    applicationStatus: "UNDER_REVIEW",
    studentStatus: "APPLICANT",
    enrollmentStatus: "OFFERED",
    documents: [
      { id: "doc-001-a", type: "Birth Certificate", required: true, status: "VERIFIED" },
      { id: "doc-001-b", type: "Guardian ID", required: true, status: "VERIFIED" },
      { id: "doc-001-c", type: "Previous Report Card", required: true, status: "UPLOADED" }
    ],
    finance: {
      invoiceNo: null,
      invoiceStatus: "DRAFT",
      amountMinor: 235000,
      paidMinor: 0,
      paymentStatus: "PENDING"
    },
    updatedAt: "2026-07-24T09:45:00.000Z",
    events: [
      { at: "09:12", actorRole: "RECEPTION", message: "Application moved to UNDER_REVIEW." },
      { at: "09:28", actorRole: "RECEPTION", message: "Two required documents verified." }
    ]
  },
  {
    id: "wf-002",
    applicationNo: "APP-20260724-0820-318",
    studentName: "Karim Salem",
    appliedGrade: "Grade 10",
    ownerName: "Admissions Officer",
    applicationStatus: "DOCUMENTS_PENDING",
    studentStatus: "APPLICANT",
    enrollmentStatus: "OFFERED",
    documents: [
      { id: "doc-002-a", type: "Birth Certificate", required: true, status: "VERIFIED" },
      { id: "doc-002-b", type: "Guardian ID", required: true, status: "UPLOADED" },
      { id: "doc-002-c", type: "Previous Report Card", required: true, status: "PENDING" }
    ],
    finance: {
      invoiceNo: null,
      invoiceStatus: "DRAFT",
      amountMinor: 260000,
      paidMinor: 0,
      paymentStatus: "PENDING"
    },
    updatedAt: "2026-07-24T08:40:00.000Z",
    events: [
      { at: "08:25", actorRole: "RECEPTION", message: "Missing documents requested from guardian." }
    ]
  },
  {
    id: "wf-003",
    applicationNo: "APP-20260723-1645-776",
    studentName: "Mira Al-Rashid",
    appliedGrade: "Grade 7",
    ownerName: "Reception Team",
    applicationStatus: "APPROVED",
    studentStatus: "APPLICANT",
    enrollmentStatus: "OFFERED",
    documents: [
      { id: "doc-003-a", type: "Birth Certificate", required: true, status: "VERIFIED" },
      { id: "doc-003-b", type: "Guardian ID", required: true, status: "VERIFIED" },
      { id: "doc-003-c", type: "Previous Report Card", required: true, status: "VERIFIED" }
    ],
    finance: {
      invoiceNo: "INV-2026-392",
      invoiceStatus: "ISSUED",
      amountMinor: 198000,
      paidMinor: 0,
      paymentStatus: "PENDING"
    },
    updatedAt: "2026-07-24T07:55:00.000Z",
    events: [
      { at: "16:58", actorRole: "PRINCIPAL", message: "Application approved by principal." },
      { at: "08:05", actorRole: "FINANCE", message: "Enrollment invoice INV-2026-392 issued." }
    ]
  }
];

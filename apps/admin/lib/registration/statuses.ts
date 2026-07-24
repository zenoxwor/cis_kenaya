export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "DOCUMENTS_PENDING",
  "UNDER_REVIEW",
  "INTERVIEW_SCHEDULED",
  "APPROVED",
  "REJECTED",
  "WAITLISTED"
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DOCUMENT_STATUSES = ["PENDING", "UPLOADED", "VERIFIED", "REJECTED", "EXPIRED"] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const STUDENT_STATUSES = ["PROSPECT", "APPLICANT", "ENROLLED", "INACTIVE", "ALUMNI"] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "SETTLED", "FAILED", "REVERSED", "REFUNDED"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

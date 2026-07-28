import type { SessionUser } from "@/lib/auth/types";

export const DOCUMENT_CATEGORIES = [
  "admission",
  "identity",
  "medical",
  "academic",
  "consent",
  "finance"
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_VERIFICATION_STATUSES = [
  "missing",
  "uploaded",
  "verified",
  "rejected",
  "expired"
] as const;

export type DocumentVerificationStatus = (typeof DOCUMENT_VERIFICATION_STATUSES)[number];

export const DOCUMENT_STATUS_TRANSITIONS: Record<
  DocumentVerificationStatus,
  readonly DocumentVerificationStatus[]
> = {
  missing: ["uploaded"],
  uploaded: ["verified", "rejected", "expired"],
  verified: ["expired", "rejected"],
  rejected: ["uploaded"],
  expired: ["uploaded"]
};

export type DocumentTimelineEvent = {
  id: string;
  at: string;
  actorName: string;
  actorRole: SessionUser["role"] | "SYSTEM";
  action: string;
  note: string;
  fromStatus: DocumentVerificationStatus | null;
  toStatus: DocumentVerificationStatus | null;
};

export type DocumentReminderType = "missing" | "expiry";

export type StudentDocumentRecord = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  category: DocumentCategory;
  documentName: string;
  fileName: string | null;
  status: DocumentVerificationStatus;
  uploadedAt: string | null;
  verifiedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  reminderLeadDays: number;
  reminderEnabled: boolean;
  nextReminderAt: string | null;
  lastReminderAt: string | null;
  missingReminderEveryDays: number;
  nextMissingReminderAt: string | null;
  lastMissingReminderAt: string | null;
  lastUpdatedAt: string;
  timeline: DocumentTimelineEvent[];
};

export type DocumentReminderRecipient = {
  documentId: string;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  documentName: string;
  category: DocumentCategory;
  status: DocumentVerificationStatus;
  expiresAt: string | null;
};

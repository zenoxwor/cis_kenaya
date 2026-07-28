import type { SessionUser } from "@/lib/auth/types";
import { ROLE } from "@/lib/rbac/roles";
import { MOCK_STUDENT_DOCUMENTS } from "@/lib/document-center/mock-data";
import {
  DOCUMENT_STATUS_TRANSITIONS,
  type DocumentReminderRecipient,
  type DocumentReminderType,
  type DocumentVerificationStatus,
  type StudentDocumentRecord
} from "@/lib/document-center/types";

const documentStore: StudentDocumentRecord[] = structuredClone(MOCK_STUDENT_DOCUMENTS);

type DocumentMutationActor = Pick<SessionUser, "id" | "fullName" | "role">;

type TransitionInput = {
  documentId: string;
  targetStatus: DocumentVerificationStatus;
  actor: DocumentMutationActor;
  note?: string;
};

type UpdateExpiryInput = {
  documentId: string;
  actor: DocumentMutationActor;
  expiresAt: string | null;
  reminderLeadDays: number;
  reminderEnabled: boolean;
};

type ReminderInput = {
  actor: DocumentMutationActor;
  reminderType: DocumentReminderType;
  documentIds?: string[];
};

function cloneRecord(record: StudentDocumentRecord): StudentDocumentRecord {
  return {
    ...record,
    timeline: [...record.timeline]
  };
}

function byUpdatedDesc(a: StudentDocumentRecord, b: StudentDocumentRecord) {
  return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
}

function toIsoAtStartOfDay(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid expiry date.");
  }
  return date.toISOString();
}

function addDaysIso(sourceIso: string, days: number) {
  const date = new Date(sourceIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function computeStatus(record: StudentDocumentRecord, now: Date) {
  if (record.status === "verified" && record.expiresAt) {
    const expiry = new Date(record.expiresAt);
    if (expiry.getTime() < now.getTime()) {
      return "expired" as const;
    }
  }
  return record.status;
}

function pushTimeline(
  record: StudentDocumentRecord,
  actor: DocumentMutationActor | { fullName: string; role: "SYSTEM" },
  action: string,
  note: string,
  fromStatus: DocumentVerificationStatus | null,
  toStatus: DocumentVerificationStatus | null,
  at: string
) {
  record.timeline.unshift({
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
    at,
    actorName: actor.fullName,
    actorRole: actor.role,
    action,
    note,
    fromStatus,
    toStatus
  });
}

function applySystemExpiry(record: StudentDocumentRecord, now: Date) {
  if (record.status !== "verified" || !record.expiresAt) {
    return;
  }

  const expiresAt = new Date(record.expiresAt);
  if (expiresAt.getTime() < now.getTime()) {
    const at = now.toISOString();
    const fromStatus = record.status;
    record.status = "expired";
    record.lastUpdatedAt = at;
    record.nextReminderAt = null;
    pushTimeline(
      record,
      { fullName: "System Scheduler", role: "SYSTEM" },
      "Document expired",
      "Verification has expired and needs a fresh upload.",
      fromStatus,
      "expired",
      at
    );
  }
}

function canViewRecord(record: StudentDocumentRecord, user: SessionUser) {
  if (user.role !== ROLE.TEACHER) {
    return true;
  }

  const assignedClasses = user.assignedClassIds ?? [];
  return assignedClasses.includes(record.classId);
}

function syncSystemStatuses() {
  const now = new Date();
  for (const record of documentStore) {
    applySystemExpiry(record, now);
  }
}

function getRecordOrThrow(documentId: string) {
  const record = documentStore.find(doc => doc.id === documentId);
  if (!record) {
    throw new Error("Document record not found.");
  }
  return record;
}

export function listDocumentRecordsForUser(user: SessionUser) {
  syncSystemStatuses();
  return documentStore.filter(record => canViewRecord(record, user)).map(cloneRecord).sort(byUpdatedDesc);
}

export function transitionDocumentStatus(input: TransitionInput) {
  syncSystemStatuses();
  const record = getRecordOrThrow(input.documentId);
  const fromStatus = computeStatus(record, new Date());

  if (fromStatus === input.targetStatus) {
    return cloneRecord(record);
  }

  const allowed = DOCUMENT_STATUS_TRANSITIONS[fromStatus].includes(input.targetStatus);
  if (!allowed) {
    throw new Error(`Invalid status transition from ${fromStatus} to ${input.targetStatus}.`);
  }

  const nowIso = new Date().toISOString();

  if (input.targetStatus === "uploaded") {
    record.uploadedAt = nowIso;
    record.fileName = record.fileName ?? `${record.documentName.toLowerCase().replace(/\s+/g, "_")}.pdf`;
    record.verifiedAt = null;
    record.rejectedAt = null;
    record.nextMissingReminderAt = null;
    record.lastMissingReminderAt = null;
  }

  if (input.targetStatus === "verified") {
    record.verifiedAt = nowIso;
    record.rejectedAt = null;
    record.nextMissingReminderAt = null;
    record.lastMissingReminderAt = null;
    if (record.reminderEnabled && record.expiresAt) {
      record.nextReminderAt = addDaysIso(record.expiresAt, -Math.max(record.reminderLeadDays, 1));
    }
  }

  if (input.targetStatus === "rejected") {
    record.rejectedAt = nowIso;
    record.nextMissingReminderAt = addDaysIso(nowIso, Math.max(record.missingReminderEveryDays, 1));
  }

  if (input.targetStatus === "expired") {
    record.nextReminderAt = null;
    record.nextMissingReminderAt = addDaysIso(nowIso, Math.max(record.missingReminderEveryDays, 1));
  }

  record.status = input.targetStatus;
  record.lastUpdatedAt = nowIso;

  pushTimeline(
    record,
    input.actor,
    `Status updated to ${input.targetStatus}`,
    input.note ?? "Document lifecycle status updated.",
    fromStatus,
    input.targetStatus,
    nowIso
  );

  return cloneRecord(record);
}

export function updateDocumentExpiry(input: UpdateExpiryInput) {
  syncSystemStatuses();
  const record = getRecordOrThrow(input.documentId);
  const nowIso = new Date().toISOString();

  const normalizedReminderLeadDays = Math.max(Math.floor(input.reminderLeadDays), 1);

  record.reminderLeadDays = normalizedReminderLeadDays;
  record.reminderEnabled = input.reminderEnabled;
  record.expiresAt = input.expiresAt ? toIsoAtStartOfDay(input.expiresAt) : null;
  record.nextReminderAt =
    input.reminderEnabled && record.expiresAt
      ? addDaysIso(record.expiresAt, -normalizedReminderLeadDays)
      : null;
  record.lastUpdatedAt = nowIso;

  if (record.status === "verified" && record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    record.status = "expired";
  }

  pushTimeline(
    record,
    input.actor,
    "Expiry schedule updated",
    record.expiresAt
      ? `Expiry set to ${record.expiresAt.slice(0, 10)} with ${normalizedReminderLeadDays}-day lead reminder.`
      : "Expiry cleared for this document.",
    null,
    null,
    nowIso
  );

  return cloneRecord(record);
}

function matchesReminderType(record: StudentDocumentRecord, reminderType: DocumentReminderType, now: Date) {
  if (reminderType === "missing") {
    return record.status === "missing" || record.status === "rejected" || record.status === "expired";
  }

  if (!record.reminderEnabled || !record.expiresAt) {
    return false;
  }

  const expiresAt = new Date(record.expiresAt);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return (record.status === "verified" || record.status === "uploaded") && daysUntilExpiry <= 21;
}

export function queueDocumentReminders(input: ReminderInput): DocumentReminderRecipient[] {
  syncSystemStatuses();
  const now = new Date();
  const nowIso = now.toISOString();
  const scopedIds = new Set(input.documentIds ?? []);

  const reminders: DocumentReminderRecipient[] = [];

  for (const record of documentStore) {
    if (scopedIds.size > 0 && !scopedIds.has(record.id)) {
      continue;
    }

    if (!matchesReminderType(record, input.reminderType, now)) {
      continue;
    }

    reminders.push({
      documentId: record.id,
      studentName: record.studentName,
      guardianName: record.guardianName,
      guardianPhone: record.guardianPhone,
      guardianEmail: record.guardianEmail,
      documentName: record.documentName,
      category: record.category,
      status: record.status,
      expiresAt: record.expiresAt
    });

    if (input.reminderType === "missing") {
      record.lastMissingReminderAt = nowIso;
      record.nextMissingReminderAt = addDaysIso(nowIso, Math.max(record.missingReminderEveryDays, 1));
    } else {
      record.lastReminderAt = nowIso;
      record.nextReminderAt = null;
    }

    record.lastUpdatedAt = nowIso;
    pushTimeline(
      record,
      input.actor,
      `${input.reminderType === "missing" ? "Missing" : "Expiry"} reminder sent`,
      "Guardian reminder logged to communications history.",
      null,
      null,
      nowIso
    );
  }

  return reminders;
}

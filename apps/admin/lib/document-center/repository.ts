import type { DocumentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { SessionUser } from "@/lib/auth/types";
import { ROLE } from "@/lib/rbac/roles";
import {
  DOCUMENT_STATUS_TRANSITIONS,
  type DocumentCategory,
  type DocumentReminderRecipient,
  type DocumentReminderType,
  type DocumentVerificationStatus,
  type StudentDocumentRecord
} from "@/lib/document-center/types";

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

function toVerificationStatus(status: DocumentStatus): DocumentVerificationStatus {
  switch (status) {
    case "PENDING":
      return "missing";
    case "UPLOADED":
      return "uploaded";
    case "VERIFIED":
      return "verified";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
  }
}

function toPrismaStatus(status: DocumentVerificationStatus): DocumentStatus {
  switch (status) {
    case "missing":
      return "PENDING";
    case "uploaded":
      return "UPLOADED";
    case "verified":
      return "VERIFIED";
    case "rejected":
      return "REJECTED";
    case "expired":
      return "EXPIRED";
  }
}

function categoryFromDocumentType(documentType: string): DocumentCategory {
  const lower = documentType.toLowerCase().replace(/_/g, " ");
  if (lower.includes("birth") || lower.includes("national id") || lower.includes("passport") || lower.includes("guardian id")) {
    return "identity";
  }
  if (lower.includes("medical") || lower.includes("immuniz") || lower.includes("vaccine")) {
    return "medical";
  }
  if (lower.includes("transcript") || lower.includes("report card") || lower.includes("previous school") || lower.includes("academic")) {
    return "academic";
  }
  if (lower.includes("admission")) {
    return "admission";
  }
  if (lower.includes("consent")) {
    return "consent";
  }
  if (lower.includes("fee") || lower.includes("finance")) {
    return "finance";
  }
  return "identity";
}

function formatDocumentType(documentType: string): string {
  return documentType
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function addDaysIso(sourceIso: string, days: number) {
  const date = new Date(sourceIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function toIsoAtStartOfDay(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid expiry date.");
  }
  return date.toISOString();
}

type DbDocWithJoins = Awaited<ReturnType<typeof fetchDocumentsWithJoins>>[number];

async function fetchDocumentsWithJoins(whereClause?: Prisma.StudentDocumentWhereInput) {
  return prisma.studentDocument.findMany({
    where: whereClause,
    include: {
      student: {
        include: {
          schoolClass: { select: { id: true, name: true } },
          studentLinks: {
            include: {
              guardian: { select: { fullName: true, phoneNumber: true, email: true } }
            },
            orderBy: [{ isPrimary: "desc" }]
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

function toRecord(doc: DbDocWithJoins): StudentDocumentRecord {
  const student = doc.student;
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const classId = student.schoolClassId ?? "unassigned";
  const className = student.schoolClass?.name ?? "Unassigned";
  const guardianLink = student.studentLinks[0];
  const guardianName = guardianLink?.guardian.fullName ?? "—";
  const guardianPhone = guardianLink?.guardian.phoneNumber ?? "";
  const guardianEmail = guardianLink?.guardian.email ?? null;

  return {
    id: doc.id,
    studentId: doc.studentId,
    studentName,
    classId,
    className,
    guardianName,
    guardianPhone,
    guardianEmail,
    category: categoryFromDocumentType(doc.documentType),
    documentName: formatDocumentType(doc.documentType),
    fileName: doc.fileName,
    storagePath: doc.storagePath,
    signedUrl: null,
    status: toVerificationStatus(doc.status),
    uploadedAt: doc.uploadedAt?.toISOString() ?? null,
    verifiedAt: doc.verifiedAt?.toISOString() ?? null,
    rejectedAt: doc.rejectedAt?.toISOString() ?? null,
    expiresAt: doc.expiresAt?.toISOString() ?? null,
    reminderLeadDays: doc.reminderLeadDays,
    reminderEnabled: doc.reminderEnabled,
    nextReminderAt: doc.nextReminderAt?.toISOString() ?? null,
    lastReminderAt: doc.lastReminderAt?.toISOString() ?? null,
    missingReminderEveryDays: doc.missingReminderEveryDays,
    nextMissingReminderAt: doc.nextMissingReminderAt?.toISOString() ?? null,
    lastMissingReminderAt: doc.lastMissingReminderAt?.toISOString() ?? null,
    lastUpdatedAt: doc.updatedAt.toISOString(),
    timeline: []
  };
}

async function syncExpiredDocuments(docIds: string[]) {
  if (docIds.length === 0) return;
  const now = new Date();
  await prisma.studentDocument.updateMany({
    where: {
      id: { in: docIds },
      status: "VERIFIED",
      expiresAt: { lt: now }
    },
    data: { status: "EXPIRED" }
  });
}

function canViewDocument(doc: { student: { schoolClassId: string | null } }, user: SessionUser) {
  if (user.role !== ROLE.TEACHER) return true;
  const classId = doc.student.schoolClassId;
  const assignedClasses = user.assignedClassIds ?? [];
  return classId !== null && assignedClasses.includes(classId);
}

export async function listDocumentRecordsForUser(user: SessionUser): Promise<StudentDocumentRecord[]> {
  const whereClause =
    user.role === ROLE.TEACHER
      ? { student: { schoolClassId: { in: user.assignedClassIds ?? [] } } }
      : undefined;

  const studentWhereClause =
    user.role === ROLE.TEACHER
      ? { schoolClassId: { in: user.assignedClassIds ?? [] } }
      : undefined;

  const [docs, allStudents] = await Promise.all([
    fetchDocumentsWithJoins(whereClause),
    prisma.student.findMany({
      where: studentWhereClause,
      include: {
        schoolClass: { select: { id: true, name: true } },
        studentLinks: {
          include: {
            guardian: { select: { fullName: true, phoneNumber: true, email: true } }
          },
          orderBy: [{ isPrimary: "desc" }]
        }
      }
    })
  ]);

  const expiredCandidateIds = docs
    .filter(doc => doc.status === "VERIFIED" && doc.expiresAt && doc.expiresAt < new Date())
    .map(doc => doc.id);
  await syncExpiredDocuments(expiredCandidateIds);

  const freshDocs = expiredCandidateIds.length > 0
    ? await fetchDocumentsWithJoins(whereClause)
    : docs;

  const docRecords = freshDocs.filter(doc => canViewDocument(doc, user)).map(toRecord);

  // Find students who have no documents — add a placeholder "missing" row so they appear in the list
  const studentsWithDocs = new Set(freshDocs.map(doc => doc.studentId));
  const studentsWithoutDocs = allStudents.filter(s => !studentsWithDocs.has(s.id));

  const placeholderRecords: StudentDocumentRecord[] = studentsWithoutDocs.map(student => {
    const guardianLink = student.studentLinks[0];
    return {
      id: `placeholder-${student.id}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      classId: student.schoolClassId ?? "unassigned",
      className: student.schoolClass?.name ?? "Unassigned",
      guardianName: guardianLink?.guardian.fullName ?? "—",
      guardianPhone: guardianLink?.guardian.phoneNumber ?? "",
      guardianEmail: guardianLink?.guardian.email ?? null,
      category: "identity" as const,
      documentName: "No documents uploaded yet",
      fileName: null,
      storagePath: null,
      signedUrl: null,
      status: "missing" as const,
      uploadedAt: null,
      verifiedAt: null,
      rejectedAt: null,
      expiresAt: null,
      reminderLeadDays: 30,
      reminderEnabled: false,
      nextReminderAt: null,
      lastReminderAt: null,
      missingReminderEveryDays: 7,
      nextMissingReminderAt: null,
      lastMissingReminderAt: null,
      lastUpdatedAt: student.createdAt?.toISOString() ?? new Date().toISOString(),
      timeline: []
    };
  });

  return [...docRecords, ...placeholderRecords];
}

export async function transitionDocumentStatus(input: TransitionInput): Promise<void> {
  const doc = await prisma.studentDocument.findUnique({
    where: { id: input.documentId },
    select: { id: true, status: true, expiresAt: true, reminderEnabled: true, reminderLeadDays: true, missingReminderEveryDays: true }
  });
  if (!doc) throw new Error("Document record not found.");

  let effectiveStatus = toVerificationStatus(doc.status);
  if (effectiveStatus === "verified" && doc.expiresAt && doc.expiresAt < new Date()) {
    effectiveStatus = "expired";
  }

  if (effectiveStatus === input.targetStatus) return;

  const allowed = DOCUMENT_STATUS_TRANSITIONS[effectiveStatus].includes(input.targetStatus);
  if (!allowed) {
    throw new Error(`Invalid status transition from ${effectiveStatus} to ${input.targetStatus}.`);
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const updateData: Parameters<typeof prisma.studentDocument.update>[0]["data"] = {
    status: toPrismaStatus(input.targetStatus),
    notes: input.note ?? undefined
  };

  if (input.targetStatus === "uploaded") {
    updateData.uploadedAt = now;
    updateData.verifiedAt = null;
    updateData.rejectedAt = null;
    updateData.nextMissingReminderAt = null;
    updateData.lastMissingReminderAt = null;
  }

  if (input.targetStatus === "verified") {
    updateData.verifiedAt = now;
    updateData.rejectedAt = null;
    updateData.nextMissingReminderAt = null;
    updateData.lastMissingReminderAt = null;
    if (doc.reminderEnabled && doc.expiresAt) {
      updateData.nextReminderAt = new Date(
        addDaysIso(doc.expiresAt.toISOString(), -Math.max(doc.reminderLeadDays, 1))
      );
    }
  }

  if (input.targetStatus === "rejected") {
    updateData.rejectedAt = now;
    updateData.nextMissingReminderAt = new Date(
      addDaysIso(nowIso, Math.max(doc.missingReminderEveryDays, 1))
    );
  }

  if (input.targetStatus === "expired") {
    updateData.nextReminderAt = null;
    updateData.nextMissingReminderAt = new Date(
      addDaysIso(nowIso, Math.max(doc.missingReminderEveryDays, 1))
    );
  }

  await prisma.studentDocument.update({
    where: { id: input.documentId },
    data: updateData
  });
}

export async function updateDocumentExpiry(input: UpdateExpiryInput): Promise<void> {
  const doc = await prisma.studentDocument.findUnique({
    where: { id: input.documentId },
    select: { id: true }
  });
  if (!doc) throw new Error("Document record not found.");

  const normalizedReminderLeadDays = Math.max(Math.floor(input.reminderLeadDays), 1);
  const expiresAt = input.expiresAt ? new Date(toIsoAtStartOfDay(input.expiresAt)) : null;

  const nextReminderAt =
    input.reminderEnabled && expiresAt
      ? new Date(addDaysIso(expiresAt.toISOString(), -normalizedReminderLeadDays))
      : null;

  const now = new Date();
  const newStatus = expiresAt && expiresAt < now ? "EXPIRED" as DocumentStatus : undefined;

  await prisma.studentDocument.update({
    where: { id: input.documentId },
    data: {
      expiresAt,
      reminderLeadDays: normalizedReminderLeadDays,
      reminderEnabled: input.reminderEnabled,
      nextReminderAt,
      ...(newStatus ? { status: newStatus } : {})
    }
  });
}

function matchesReminderType(
  record: StudentDocumentRecord,
  reminderType: DocumentReminderType,
  now: Date
) {
  if (reminderType === "missing") {
    return record.status === "missing" || record.status === "rejected" || record.status === "expired";
  }
  if (!record.reminderEnabled || !record.expiresAt) return false;
  const expiresAt = new Date(record.expiresAt);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return (record.status === "verified" || record.status === "uploaded") && daysUntilExpiry <= 21;
}

export async function queueDocumentReminders(input: ReminderInput): Promise<DocumentReminderRecipient[]> {
  const now = new Date();
  const nowIso = now.toISOString();
  const scopedIds = new Set(input.documentIds ?? []);

  const docs = await prisma.studentDocument.findMany({
    where: scopedIds.size > 0 ? { id: { in: [...scopedIds] } } : undefined,
    include: {
      student: {
        include: {
          schoolClass: { select: { id: true, name: true } },
          studentLinks: {
            include: {
              guardian: { select: { fullName: true, phoneNumber: true, email: true } }
            },
            orderBy: [{ isPrimary: "desc" }]
          }
        }
      }
    }
  });

  const expiredIds = docs
    .filter(doc => doc.status === "VERIFIED" && doc.expiresAt && doc.expiresAt < now)
    .map(doc => doc.id);
  await syncExpiredDocuments(expiredIds);

  const records = docs.map(toRecord);
  const reminders: DocumentReminderRecipient[] = [];
  const idsToUpdate: string[] = [];

  for (const record of records) {
    if (!matchesReminderType(record, input.reminderType, now)) continue;

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
    idsToUpdate.push(record.id);
  }

  if (idsToUpdate.length > 0) {
    const updatePayload =
      input.reminderType === "missing"
        ? {
            lastMissingReminderAt: now,
            nextMissingReminderAt: new Date(addDaysIso(nowIso, 7))
          }
        : {
            lastReminderAt: now,
            nextReminderAt: null
          };

    await prisma.studentDocument.updateMany({
      where: { id: { in: idsToUpdate } },
      data: updatePayload
    });
  }

  return reminders;
}

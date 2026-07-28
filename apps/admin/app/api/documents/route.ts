import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { canPerformAction } from "@/lib/rbac/permissions";
import {
  listDocumentRecordsForUser,
  queueDocumentReminders,
  transitionDocumentStatus,
  updateDocumentExpiry
} from "@/lib/document-center/repository";
import { DOCUMENT_VERIFICATION_STATUSES } from "@/lib/document-center/types";
import { logDocumentReminderCampaign } from "@/lib/communications/repository";
import { getSupabaseStorageClient } from "@/lib/supabase/client";
import type { StudentDocumentRecord } from "@/lib/document-center/types";

const STORAGE_BUCKET = "student-documents";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

async function attachSignedUrls(records: StudentDocumentRecord[]): Promise<StudentDocumentRecord[]> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) return records;

  return Promise.all(
    records.map(async record => {
      if (!record.storagePath) return record;
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(record.storagePath, SIGNED_URL_EXPIRY_SECONDS);
      return { ...record, signedUrl: data?.signedUrl ?? null };
    })
  );
}

type TransitionActionBody = {
  action: "transition";
  documentId: string;
  targetStatus: (typeof DOCUMENT_VERIFICATION_STATUSES)[number];
  note?: string;
};

type UpdateExpiryActionBody = {
  action: "updateExpiry";
  documentId: string;
  expiresAt: string | null;
  reminderLeadDays: number;
  reminderEnabled: boolean;
};

type SendReminderActionBody = {
  action: "sendReminders";
  reminderType: "missing" | "expiry";
  documentIds?: string[];
};

type ActionBody = TransitionActionBody | UpdateExpiryActionBody | SendReminderActionBody;

function getSessionUser(request: NextRequest) {
  const rawSession = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return parseSessionPayload(rawSession)?.user ?? null;
}

function forbidden() {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(user.role, "student_document", "view")) {
    return forbidden();
  }

  const records = await attachSignedUrls(await listDocumentRecordsForUser(user));
  return NextResponse.json({
    success: true,
    records
  });
}

export async function POST(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(user.role, "student_document", "view")) {
    return forbidden();
  }

  const body = (await request.json()) as Partial<ActionBody>;
  if (!body.action) {
    return badRequest("action is required");
  }
  const visibleRecords = await listDocumentRecordsForUser(user);
  const visibleIds = new Set(visibleRecords.map(record => record.id));

  if (body.action === "transition") {
    if (typeof body.documentId !== "string" || typeof body.targetStatus !== "string") {
      return badRequest("documentId and targetStatus are required");
    }

    if (!DOCUMENT_VERIFICATION_STATUSES.includes(body.targetStatus)) {
      return badRequest("Invalid targetStatus");
    }
    if (!visibleIds.has(body.documentId)) {
      return forbidden();
    }

    const canUploadOrUpdate =
      canPerformAction(user.role, "student_document", "create") ||
      canPerformAction(user.role, "student_document", "edit");
    const canReview = canPerformAction(user.role, "student_document", "approve");

    if (body.targetStatus === "uploaded" && !canUploadOrUpdate) {
      return forbidden();
    }

    if ((body.targetStatus === "verified" || body.targetStatus === "rejected" || body.targetStatus === "expired") && !canReview) {
      return forbidden();
    }

    await transitionDocumentStatus({
      documentId: body.documentId,
      targetStatus: body.targetStatus,
      actor: user,
      note: typeof body.note === "string" ? body.note : undefined
    });

    return NextResponse.json({
      success: true,
      records: await attachSignedUrls(await listDocumentRecordsForUser(user))
    });
  }

  if (body.action === "updateExpiry") {
    if (typeof body.documentId !== "string") {
      return badRequest("documentId is required");
    }
    if (!visibleIds.has(body.documentId)) {
      return forbidden();
    }

    if (
      !canPerformAction(user.role, "student_document", "edit") &&
      !canPerformAction(user.role, "student_document", "approve")
    ) {
      return forbidden();
    }

    if (typeof body.reminderLeadDays !== "number" || Number.isNaN(body.reminderLeadDays)) {
      return badRequest("reminderLeadDays must be a number");
    }

    if (typeof body.reminderEnabled !== "boolean") {
      return badRequest("reminderEnabled must be a boolean");
    }

    if (body.expiresAt !== null && typeof body.expiresAt !== "string") {
      return badRequest("expiresAt must be a date string or null");
    }

    await updateDocumentExpiry({
      documentId: body.documentId,
      actor: user,
      expiresAt: body.expiresAt,
      reminderLeadDays: body.reminderLeadDays,
      reminderEnabled: body.reminderEnabled
    });

    return NextResponse.json({
      success: true,
      records: await attachSignedUrls(await listDocumentRecordsForUser(user))
    });
  }

  if (body.action === "sendReminders") {
    if (body.reminderType !== "missing" && body.reminderType !== "expiry") {
      return badRequest("reminderType must be missing or expiry");
    }

    if (!canPerformAction(user.role, "communication", "create")) {
      return forbidden();
    }

    const requestedIds = body.documentIds ?? [];

    if (!Array.isArray(requestedIds) || requestedIds.some(id => typeof id !== "string")) {
      return badRequest("documentIds must be an array of strings");
    }

    if (requestedIds.some(id => !visibleIds.has(id))) {
      return forbidden();
    }

    const reminders = await queueDocumentReminders({
      actor: user,
      reminderType: body.reminderType,
      documentIds: requestedIds
    });

    const campaign = logDocumentReminderCampaign({
      sentById: user.id,
      sentByName: user.fullName,
      reminderType: body.reminderType,
      reminders
    });

    return NextResponse.json({
      success: true,
      records: await attachSignedUrls(await listDocumentRecordsForUser(user)),
      remindersSent: reminders.length,
      campaignId: campaign?.id ?? null
    });
  }

  return badRequest("Unknown action");
}

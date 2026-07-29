import { prisma } from "@/lib/db/client";
import type { SessionUser } from "@/lib/auth/types";
import { getSupabaseStorageClient } from "@/lib/supabase/client";
import { normalizeTimetableColorHex } from "@/lib/reception/timetable-colors";

const TIMETABLE_SNAPSHOT_BUCKET = "student-documents";
const TIMETABLE_JSON_PATH = "timetables/current/timetable.json";
const TIMETABLE_CSV_PATH = "timetables/current/timetable.csv";

type TimetableSnapshotRow = {
  classId: string;
  gradeLevel: string;
  className: string;
  dayOfWeek: string;
  period: number;
  subject: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  colorHex: string;
  updatedAt: string;
};

function toCsvCell(value: string | number) {
  const text = String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function toCsv(rows: TimetableSnapshotRow[]) {
  const header = [
    "classId",
    "gradeLevel",
    "className",
    "dayOfWeek",
    "period",
    "subject",
    "teacherName",
    "startTime",
    "endTime",
    "colorHex",
    "updatedAt"
  ];
  const lines = [
    header.join(","),
    ...rows.map(row =>
      [
        row.classId,
        row.gradeLevel,
        row.className,
        row.dayOfWeek,
        row.period,
        row.subject,
        row.teacherName,
        row.startTime,
        row.endTime,
        row.colorHex,
        row.updatedAt
      ]
        .map(toCsvCell)
        .join(",")
    )
  ];
  return `${lines.join("\n")}\n`;
}

async function resolveCampusId(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { campusId: true }
  });
  if (dbUser?.campusId) {
    return dbUser.campusId;
  }

  const campus = await prisma.campus.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (campus?.id) {
    return campus.id;
  }

  throw new Error("No campus configured. Seed at least one campus before using reception tools.");
}

async function listTimetableSnapshotRows(user: SessionUser): Promise<TimetableSnapshotRow[]> {
  const campusId = await resolveCampusId(user.id);
  const rows = await prisma.timetable.findMany({
    where: { campusId },
    include: {
      class: {
        select: {
          id: true,
          gradeLevel: true,
          name: true
        }
      }
    },
    orderBy: [
      { class: { gradeLevel: "asc" } },
      { class: { name: "asc" } },
      { dayOfWeek: "asc" },
      { period: "asc" }
    ]
  });

  return rows.map(item => ({
    classId: item.classId,
    gradeLevel: item.class.gradeLevel,
    className: item.class.name,
    dayOfWeek: item.dayOfWeek,
    period: item.period,
    subject: item.subject,
    teacherName: item.teacherName,
    startTime: item.startTime,
    endTime: item.endTime,
    colorHex: normalizeTimetableColorHex(item.colorHex),
    updatedAt: item.updatedAt.toISOString()
  }));
}

export type TimetableSnapshotSyncResult = {
  bucket: string;
  jsonPath: string;
  csvPath: string;
  rowCount: number;
  generatedAt: string;
};

const REQUIRED_MIME_TYPES = ["application/json", "text/csv"];

/**
 * Detect whether an error message indicates a rejected MIME type.
 */
function isMimeRejectionError(message: string): boolean {
  return /mime type.*not supported|mime.*not allowed|invalid mime/i.test(message);
}

/**
 * Attempt to ensure the bucket allows the required MIME types.
 * Fetches the current bucket config and, if allowedMimeTypes is restricted,
 * merges in the required types. Failures are non-fatal — upload is attempted regardless.
 */
async function ensureBucketAllowsMimeTypes(supabase: ReturnType<typeof getSupabaseStorageClient>) {
  if (!supabase) return;

  try {
    const { data: bucket, error } = await supabase.storage.getBucket(TIMETABLE_SNAPSHOT_BUCKET);
    if (error || !bucket) return; // can't inspect — proceed optimistically

    // Supabase SDK returns snake_case fields for Bucket objects.
    const existing: string[] = (bucket as unknown as { allowed_mime_types?: string[] }).allowed_mime_types ?? [];
    if (existing.length === 0) return; // no restrictions in place

    const missing = REQUIRED_MIME_TYPES.filter(m => !existing.includes(m));
    if (missing.length === 0) return; // already allowed

    // Merge missing types into the existing allowlist (preserves existing entries).
    // updateBucket requires public to be passed — use current bucket visibility.
    await supabase.storage.updateBucket(TIMETABLE_SNAPSHOT_BUCKET, {
      public: bucket.public,
      allowedMimeTypes: [...existing, ...missing]
    });
  } catch {
    // Non-fatal: bucket inspection/update failing should not block the upload attempt.
  }
}

/**
 * Upload a file to Supabase Storage. If the primary contentType is rejected,
 * retries once with text/plain (same bytes) for graceful degradation.
 */
async function uploadWithMimeFallback(
  supabase: NonNullable<ReturnType<typeof getSupabaseStorageClient>>,
  path: string,
  bytes: Uint8Array,
  primaryContentType: string,
  label: string
) {
  const primary = await supabase.storage.from(TIMETABLE_SNAPSHOT_BUCKET).upload(path, bytes, {
    contentType: primaryContentType,
    upsert: true
  });

  if (!primary.error) return;

  if (isMimeRejectionError(primary.error.message)) {
    // Retry with text/plain as a fallback before surfacing an error.
    const fallback = await supabase.storage.from(TIMETABLE_SNAPSHOT_BUCKET).upload(path, bytes, {
      contentType: "text/plain",
      upsert: true
    });

    if (!fallback.error) return;

    throw new Error(
      `Failed to upload timetable ${label} snapshot even with text/plain fallback: ` +
        `${fallback.error.message}. ` +
        `Ensure the '${TIMETABLE_SNAPSHOT_BUCKET}' bucket allows MIME types: ` +
        REQUIRED_MIME_TYPES.join(", ") +
        ". You can update this in the Supabase Dashboard → Storage → " +
        TIMETABLE_SNAPSHOT_BUCKET +
        " → Edit bucket settings."
    );
  }

  throw new Error(
    `Failed to upload timetable ${label} snapshot: ${primary.error.message}`
  );
}

export async function syncTimetableSnapshotFile(
  user: SessionUser
): Promise<TimetableSnapshotSyncResult> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) {
    throw new Error("Supabase storage is not configured.");
  }

  // Proactively widen bucket MIME allowlist if needed (best-effort, non-fatal).
  await ensureBucketAllowsMimeTypes(supabase);

  const rows = await listTimetableSnapshotRows(user);
  const generatedAt = new Date().toISOString();
  const jsonPayload = {
    generatedAt,
    rowCount: rows.length,
    rows
  };
  const csvPayload = toCsv(rows);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(JSON.stringify(jsonPayload, null, 2));
  const csvBytes = encoder.encode(csvPayload);

  await Promise.all([
    uploadWithMimeFallback(supabase, TIMETABLE_JSON_PATH, jsonBytes, "application/json", "JSON"),
    uploadWithMimeFallback(supabase, TIMETABLE_CSV_PATH, csvBytes, "text/csv", "CSV")
  ]);

  return {
    bucket: TIMETABLE_SNAPSHOT_BUCKET,
    jsonPath: TIMETABLE_JSON_PATH,
    csvPath: TIMETABLE_CSV_PATH,
    rowCount: rows.length,
    generatedAt
  };
}

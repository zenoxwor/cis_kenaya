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

export async function syncTimetableSnapshotFile(
  user: SessionUser
): Promise<TimetableSnapshotSyncResult> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) {
    throw new Error("Supabase storage is not configured.");
  }

  const rows = await listTimetableSnapshotRows(user);
  const generatedAt = new Date().toISOString();
  const jsonPayload = {
    generatedAt,
    rowCount: rows.length,
    rows
  };
  const csvPayload = toCsv(rows);

  const [jsonUpload, csvUpload] = await Promise.all([
    supabase.storage.from(TIMETABLE_SNAPSHOT_BUCKET).upload(
      TIMETABLE_JSON_PATH,
      Buffer.from(JSON.stringify(jsonPayload, null, 2), "utf-8"),
      {
        contentType: "application/json",
        upsert: true
      }
    ),
    supabase.storage.from(TIMETABLE_SNAPSHOT_BUCKET).upload(
      TIMETABLE_CSV_PATH,
      Buffer.from(csvPayload, "utf-8"),
      {
        contentType: "text/csv",
        upsert: true
      }
    )
  ]);

  if (jsonUpload.error) {
    throw new Error(`Failed to upload timetable JSON snapshot: ${jsonUpload.error.message}`);
  }
  if (csvUpload.error) {
    throw new Error(`Failed to upload timetable CSV snapshot: ${csvUpload.error.message}`);
  }

  return {
    bucket: TIMETABLE_SNAPSHOT_BUCKET,
    jsonPath: TIMETABLE_JSON_PATH,
    csvPath: TIMETABLE_CSV_PATH,
    rowCount: rows.length,
    generatedAt
  };
}

import { prisma } from "@/lib/db/client";
import type { SessionUser } from "@/lib/auth/types";
import { getSupabaseStorageClient } from "@/lib/supabase/client";

const DAILY_REPORT_BUCKET = "student-documents";
const DAILY_REPORT_PREFIX = "reception/daily-reports";

export type DailyReportGatePassRow = {
  passNumber: string;
  visitorName: string;
  visitorId: string;
  hostName: string;
  purpose: string;
  entryTime: string;
  exitTime: string | null;
  status: string;
};

export type DailyReportIncidentRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  reportedBy: string;
  studentName: string | null;
  createdAt: string;
};

export type DailyReportAppointmentRow = {
  id: string;
  title: string;
  hostName: string;
  visitorName: string;
  scheduledAt: string;
  status: string;
};

export type DailyReportStaffAttendanceRow = {
  userId: string;
  staffName: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
};

export type DailyReportSnapshot = {
  generatedAt: string;
  date: string;
  visitors: DailyReportGatePassRow[];
  incidents: DailyReportIncidentRow[];
  appointments: DailyReportAppointmentRow[];
  staffAttendance: DailyReportStaffAttendanceRow[];
};

export type DailyReportSyncResult = {
  bucket: string;
  jsonPath: string;
  csvPath: string;
  date: string;
  generatedAt: string;
  counts: {
    visitors: number;
    incidents: number;
    appointments: number;
    staffAttendance: number;
  };
};

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function endOfTodayUtc() {
  const today = startOfTodayUtc();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow;
}

function todayDateString() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toCsvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

const KENYA_TIME_ZONE = "Africa/Nairobi";

function formatDisplayDateTime(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: KENYA_TIME_ZONE
  }).format(parsed);
}

function formatDisplayLongDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: KENYA_TIME_ZONE
  }).format(parsed);
}

function buildCsv(snapshot: DailyReportSnapshot): string {
  const lines: string[] = [
    "Capital International School - Daily Reception Report",
    `Date: ${formatDisplayLongDate(snapshot.date)}`,
    `Generated At: ${formatDisplayDateTime(snapshot.generatedAt)}`,
    ""
  ];

  const sections = [
    {
      title: "=== VISITORS & GATE PASSES ===",
      header: ["Pass Number", "Visitor Name", "Visitor ID", "Staff Member / Host", "Purpose of Visit", "Entry Time", "Exit Time", "Status"],
      rows: snapshot.visitors.map(v => [
        v.passNumber,
        v.visitorName,
        v.visitorId,
        v.hostName,
        v.purpose,
        formatDisplayDateTime(v.entryTime),
        formatDisplayDateTime(v.exitTime),
        v.status
      ])
    },
    {
      title: "=== INCIDENTS ===",
      header: ["Record ID", "Incident Type", "Severity", "Status", "Reported By", "Student Name", "Reported At"],
      rows: snapshot.incidents.map(i => [
        i.id,
        i.title,
        i.severity,
        i.status,
        i.reportedBy,
        i.studentName ?? "",
        formatDisplayDateTime(i.createdAt)
      ])
    },
    {
      title: "=== APPOINTMENTS ===",
      header: ["Record ID", "Appointment Title", "Staff Member / Host", "Visitor Name", "Scheduled At", "Status"],
      rows: snapshot.appointments.map(a => [
        a.id,
        a.title,
        a.hostName,
        a.visitorName,
        formatDisplayDateTime(a.scheduledAt),
        a.status
      ])
    },
    {
      title: "=== STAFF ATTENDANCE ===",
      header: ["Staff ID", "Staff Name", "Check-In Time", "Check-Out Time", "Status"],
      rows: snapshot.staffAttendance.map(s => [
        s.userId,
        s.staffName,
        formatDisplayDateTime(s.checkIn),
        formatDisplayDateTime(s.checkOut),
        s.status
      ])
    }
  ];

  for (const section of sections) {
    lines.push(section.title);
    lines.push(section.header.map(toCsvCell).join(","));
    for (const row of section.rows) {
      lines.push(row.map(cell => toCsvCell(cell)).join(","));
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildReadableJsonReport(snapshot: DailyReportSnapshot) {
  return {
    "Report Title": "Capital International School - Daily Reception Report",
    Date: formatDisplayLongDate(snapshot.date),
    "Generated At": formatDisplayDateTime(snapshot.generatedAt),
    "Visitors & Gate Passes": snapshot.visitors.map(v => ({
      "Pass Number": v.passNumber,
      "Visitor Name": v.visitorName,
      "Visitor ID": v.visitorId,
      "Staff Member / Host": v.hostName,
      "Purpose of Visit": v.purpose,
      "Entry Time": formatDisplayDateTime(v.entryTime),
      "Exit Time": formatDisplayDateTime(v.exitTime),
      Status: v.status
    })),
    Incidents: snapshot.incidents.map(i => ({
      "Record ID": i.id,
      "Incident Type": i.title,
      Severity: i.severity,
      Status: i.status,
      "Reported By": i.reportedBy,
      "Student Name": i.studentName ?? "",
      "Reported At": formatDisplayDateTime(i.createdAt)
    })),
    Appointments: snapshot.appointments.map(a => ({
      "Record ID": a.id,
      "Appointment Title": a.title,
      "Staff Member / Host": a.hostName,
      "Visitor Name": a.visitorName,
      "Scheduled At": formatDisplayDateTime(a.scheduledAt),
      Status: a.status
    })),
    "Staff Attendance": snapshot.staffAttendance.map(s => ({
      "Staff ID": s.userId,
      "Staff Name": s.staffName,
      "Check-In Time": formatDisplayDateTime(s.checkIn),
      "Check-Out Time": formatDisplayDateTime(s.checkOut),
      Status: s.status
    }))
  };
}

async function resolveCampusId(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { campusId: true }
  });
  if (dbUser?.campusId) return dbUser.campusId;

  const campus = await prisma.campus.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (campus?.id) return campus.id;

  throw new Error("No campus configured. Seed at least one campus before using reception tools.");
}

async function buildSnapshot(campusId: string): Promise<DailyReportSnapshot> {
  const startOfDay = startOfTodayUtc();
  const endOfDay = endOfTodayUtc();
  const dateStr = todayDateString();

  const [gatePasses, incidents, appointments, staffCheckIns] = await Promise.all([
    prisma.gatePass.findMany({
      where: {
        campusId,
        checkInTime: { gte: startOfDay, lt: endOfDay }
      },
      orderBy: { checkInTime: "asc" }
    }),
    prisma.incidentReport.findMany({
      where: {
        campusId,
        createdAt: { gte: startOfDay, lt: endOfDay }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.appointment.findMany({
      where: {
        campusId,
        scheduledAt: { gte: startOfDay, lt: endOfDay }
      },
      orderBy: { scheduledAt: "asc" }
    }),
    prisma.staffCheckIn.findMany({
      where: {
        campusId,
        date: startOfDay
      },
      include: {
        user: { select: { fullName: true } }
      },
      orderBy: [{ user: { fullName: "asc" } }]
    })
  ]);

  const visitors: DailyReportGatePassRow[] = gatePasses.map(g => ({
    passNumber: g.passNumber,
    visitorName: g.visitorName,
    visitorId: g.visitorId,
    hostName: g.personToMeet,
    purpose: g.purpose,
    entryTime: g.checkInTime.toISOString(),
    exitTime: g.checkOutTime?.toISOString() ?? null,
    status: g.status
  }));

  const incidentRows: DailyReportIncidentRow[] = incidents.map(i => ({
    id: i.id,
    title: i.type,
    severity: i.priority,
    status: i.status,
    reportedBy: i.reportedBy,
    studentName: i.personName ?? null,
    createdAt: i.createdAt.toISOString()
  }));

  const appointmentRows: DailyReportAppointmentRow[] = appointments.map(a => ({
    id: a.id,
    title: a.title,
    hostName: a.meetingWith,
    visitorName: a.parentName,
    scheduledAt: a.scheduledAt.toISOString(),
    status: a.status
  }));

  const staffAttendanceRows: DailyReportStaffAttendanceRow[] = staffCheckIns.map(s => ({
    userId: s.userId,
    staffName: s.user.fullName,
    checkIn: s.checkInTime.toISOString(),
    checkOut: s.checkOutTime?.toISOString() ?? null,
    status: s.status
  }));

  return {
    generatedAt: new Date().toISOString(),
    date: dateStr,
    visitors,
    incidents: incidentRows,
    appointments: appointmentRows,
    staffAttendance: staffAttendanceRows
  };
}

const REQUIRED_MIME_TYPES = ["application/json", "text/csv"];

function isMimeRejectionError(message: string): boolean {
  return /mime type.*not supported|mime.*not allowed|invalid mime/i.test(message);
}

async function ensureBucketAllowsMimeTypes(supabase: ReturnType<typeof getSupabaseStorageClient>) {
  if (!supabase) return;
  try {
    const { data: bucket, error } = await supabase.storage.getBucket(DAILY_REPORT_BUCKET);
    if (error || !bucket) return;

    const existing: string[] =
      (bucket as unknown as { allowed_mime_types?: string[] }).allowed_mime_types ?? [];
    if (existing.length === 0) return;

    const missing = REQUIRED_MIME_TYPES.filter(m => !existing.includes(m));
    if (missing.length === 0) return;

    await supabase.storage.updateBucket(DAILY_REPORT_BUCKET, {
      public: bucket.public,
      allowedMimeTypes: [...existing, ...missing]
    });
  } catch {
    // Non-fatal
  }
}

async function uploadWithMimeFallback(
  supabase: NonNullable<ReturnType<typeof getSupabaseStorageClient>>,
  path: string,
  bytes: Uint8Array,
  primaryContentType: string,
  label: string
) {
  const primary = await supabase.storage.from(DAILY_REPORT_BUCKET).upload(path, bytes, {
    contentType: primaryContentType,
    upsert: true
  });

  if (!primary.error) return;

  if (isMimeRejectionError(primary.error.message)) {
    const fallback = await supabase.storage.from(DAILY_REPORT_BUCKET).upload(path, bytes, {
      contentType: "text/plain",
      upsert: true
    });

    if (!fallback.error) return;

    throw new Error(
      `Failed to upload daily report ${label} snapshot even with text/plain fallback: ` +
        `${fallback.error.message}. ` +
        `Ensure the '${DAILY_REPORT_BUCKET}' bucket allows MIME types: ` +
        REQUIRED_MIME_TYPES.join(", ") +
        ". You can update this in the Supabase Dashboard → Storage → " +
        DAILY_REPORT_BUCKET +
        " → Edit bucket settings."
    );
  }

  throw new Error(`Failed to upload daily report ${label}: ${primary.error.message}`);
}

export type SavedDailyReport = {
  date: string;
  jsonUrl: string;
  csvUrl: string;
};

export async function syncDailyReportSnapshot(user: SessionUser): Promise<DailyReportSyncResult> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) {
    throw new Error("Supabase storage is not configured.");
  }

  await ensureBucketAllowsMimeTypes(supabase);

  const campusId = await resolveCampusId(user.id);
  const snapshot = await buildSnapshot(campusId);

  const jsonPath = `${DAILY_REPORT_PREFIX}/${snapshot.date}.json`;
  const csvPath = `${DAILY_REPORT_PREFIX}/${snapshot.date}.csv`;

  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(JSON.stringify(buildReadableJsonReport(snapshot), null, 2));
  const csvBytes = encoder.encode(buildCsv(snapshot));

  await Promise.all([
    uploadWithMimeFallback(supabase, jsonPath, jsonBytes, "application/json", "JSON"),
    uploadWithMimeFallback(supabase, csvPath, csvBytes, "text/csv", "CSV")
  ]);

  return {
    bucket: DAILY_REPORT_BUCKET,
    jsonPath,
    csvPath,
    date: snapshot.date,
    generatedAt: snapshot.generatedAt,
    counts: {
      visitors: snapshot.visitors.length,
      incidents: snapshot.incidents.length,
      appointments: snapshot.appointments.length,
      staffAttendance: snapshot.staffAttendance.length
    }
  };
}

export async function listDailyReports(): Promise<{ reports?: SavedDailyReport[]; error?: string }> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) return { error: "Supabase storage is not configured." };

  const { data, error } = await supabase.storage
    .from(DAILY_REPORT_BUCKET)
    .list(DAILY_REPORT_PREFIX, { limit: 100, sortBy: { column: "name", order: "desc" } });

  if (error) return { error: error.message };
  if (!data) return { reports: [] };

  const jsonFiles = data.filter(f => f.name.endsWith(".json"));

  const reports: SavedDailyReport[] = [];
  for (const file of jsonFiles) {
    const date = file.name.replace(".json", "");
    const jsonPath = `${DAILY_REPORT_PREFIX}/${file.name}`;
    const csvPath = `${DAILY_REPORT_PREFIX}/${date}.csv`;

    const [{ data: jsonSigned }, { data: csvSigned }] = await Promise.all([
      supabase.storage.from(DAILY_REPORT_BUCKET).createSignedUrl(jsonPath, 3600),
      supabase.storage.from(DAILY_REPORT_BUCKET).createSignedUrl(csvPath, 3600)
    ]);

    if (jsonSigned && csvSigned) {
      reports.push({ date, jsonUrl: jsonSigned.signedUrl, csvUrl: csvSigned.signedUrl });
    }
  }

  return { reports };
}

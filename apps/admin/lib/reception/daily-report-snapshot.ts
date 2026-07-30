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

function formatReadableDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-KE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true
    });
  } catch { return iso ?? ""; }
}

function toCsvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(snapshot: DailyReportSnapshot): string {
  const sections: string[] = [];

  const reportDate = new Date(snapshot.generatedAt).toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const fileHeader = [
    `Capital International School - Daily Reception Report`,
    `Date: ${reportDate}`,
    `Generated At: ${formatReadableDate(snapshot.generatedAt)}`,
    ``
  ].join("\n");

  const visitorHeader = ["Pass Number","Visitor Name","Visitor ID","Staff Member / Host","Purpose of Visit","Entry Time","Exit Time","Status"].join(",");
  const visitorRows = snapshot.visitors.map(v =>
    [v.passNumber, v.visitorName, v.visitorId, v.hostName, v.purpose,
      formatReadableDate(v.entryTime), formatReadableDate(v.exitTime), v.status]
      .map(toCsvCell).join(",")
  );
  sections.push(["=== VISITORS & GATE PASSES ===", visitorHeader, ...visitorRows].join("\n"));

  const incidentHeader = ["Incident Type","Severity","Status","Reported By","Student Name","Reported At"].join(",");
  const incidentRows = snapshot.incidents.map(i =>
    [i.title, i.severity, i.status, i.reportedBy, i.studentName ?? "", formatReadableDate(i.createdAt)]
      .map(toCsvCell).join(",")
  );
  sections.push(["=== INCIDENTS ===", incidentHeader, ...incidentRows].join("\n"));

  const appointmentHeader = ["Appointment Title","Staff Member / Host","Visitor Name","Scheduled At","Status"].join(",");
  const appointmentRows = snapshot.appointments.map(a =>
    [a.title, a.hostName, a.visitorName, formatReadableDate(a.scheduledAt), a.status]
      .map(toCsvCell).join(",")
  );
  sections.push(["=== APPOINTMENTS ===", appointmentHeader, ...appointmentRows].join("\n"));

  const attendanceHeader = ["Staff Name","Check-In Time","Check-Out Time","Status"].join(",");
  const attendanceRows = snapshot.staffAttendance.map(s =>
    [s.staffName, formatReadableDate(s.checkIn), formatReadableDate(s.checkOut), s.status]
      .map(toCsvCell).join(",")
  );
  sections.push(["=== STAFF ATTENDANCE ===", attendanceHeader, ...attendanceRows].join("\n"));

  return fileHeader + sections.join("\n\n") + "\n";
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
  const friendlyJson = {
    "Report Title": "Capital International School - Daily Reception Report",
    "Date": new Date(snapshot.generatedAt).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    "Generated At": formatReadableDate(snapshot.generatedAt),
    "Visitors & Gate Passes": snapshot.visitors.map(v => ({
      "Pass Number": v.passNumber,
      "Visitor Name": v.visitorName,
      "Visitor ID": v.visitorId,
      "Staff Member / Host": v.hostName,
      "Purpose of Visit": v.purpose,
      "Entry Time": formatReadableDate(v.entryTime),
      "Exit Time": formatReadableDate(v.exitTime),
      "Status": v.status
    })),
    "Incidents": snapshot.incidents.map(i => ({
      "Incident Type": i.title,
      "Severity": i.severity,
      "Status": i.status,
      "Reported By": i.reportedBy,
      "Student Name": i.studentName ?? "",
      "Reported At": formatReadableDate(i.createdAt)
    })),
    "Appointments": snapshot.appointments.map(a => ({
      "Appointment Title": a.title,
      "Staff Member / Host": a.hostName,
      "Visitor Name": a.visitorName,
      "Scheduled At": formatReadableDate(a.scheduledAt),
      "Status": a.status
    })),
    "Staff Attendance": snapshot.staffAttendance.map(s => ({
      "Staff Name": s.staffName,
      "Check-In Time": formatReadableDate(s.checkIn),
      "Check-Out Time": formatReadableDate(s.checkOut),
      "Status": s.status
    }))
  };
  const jsonBytes = encoder.encode(JSON.stringify(friendlyJson, null, 2));
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

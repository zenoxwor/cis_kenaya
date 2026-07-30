import { Prisma, RoleCode, type TimetableDayOfWeek } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { SessionUser } from "@/lib/auth/types";
import { normalizeTimetableColorHex } from "@/lib/reception/timetable-colors";
import { ROLE } from "@/lib/rbac/roles";

export const RECEPTION_TIMETABLE_GRADES = [
  "Nursery",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10"
] as const;

export const RECEPTION_DOCUMENT_TYPES = ["Passport", "Birth Certificate", "ID"] as const;

export type ReceptionTimetableGradeOption = {
  gradeLevel: (typeof RECEPTION_TIMETABLE_GRADES)[number];
  classId: string | null;
};

export type ReceptionTimetableEntry = {
  id: string;
  classId: string;
  dayOfWeek: TimetableDayOfWeek;
  period: number;
  subject: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  colorHex: string;
};

export type BulkTimetableSeedResult = {
  classesProcessed: number;
  slotsCreated: number;
  slotsUpdated: number;
  slotsUnchanged: number;
};

export type ReceptionStaffAttendanceRow = {
  userId: string;
  staffName: string;
  staffId: string;
  status: "IN" | "OUT";
  entryTime: string | null;
  outTime: string | null;
  lastActionTime: string | null;
};

export type ReceptionStudentDocument = {
  id: string | null;
  documentType: (typeof RECEPTION_DOCUMENT_TYPES)[number];
  fileName: string | null;
  status: string | null;
  uploadedAt: string | null;
  storagePath: string | null;
};

export type ReceptionStudentDocumentRow = {
  studentId: string;
  displayStudentId: string;
  studentName: string;
  gradeLevel: string;
  documents: ReceptionStudentDocument[];
};

export type ReceptionIncidentLogItem = {
  id: string;
  type: string;
  personName: string | null;
  description: string;
  priority: "Low" | "Medium" | "Urgent";
  targetDepartment: string;
  createdAt: string;
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

function toThreeDigitStudentId(studentCode: string) {
  const digits = studentCode.replace(/\D/g, "");
  return (digits.slice(-3) || "0").padStart(3, "0");
}

function toDisplayStudentId(studentCode: string) {
  return `CIS-2026-${toThreeDigitStudentId(studentCode)}`;
}

function toReceptionPriority(value: string): "Low" | "Medium" | "Urgent" {
  if (value === "URGENT") return "Urgent";
  if (value === "LOW") return "Low";
  return "Medium";
}

function toPriorityDb(value: "Low" | "Medium" | "Urgent") {
  if (value === "Urgent") return "URGENT";
  if (value === "Low") return "LOW";
  return "MEDIUM";
}

function buildStaffId(user: { id: string; nationalId: string | null }) {
  const nationalId = user.nationalId?.trim();
  if (nationalId && nationalId.length > 0) {
    return nationalId;
  }
  return `STF-${user.id.slice(-6).toUpperCase()}`;
}

function buildAttendanceDateTime(baseDate: Date, time: string) {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number.parseInt(hoursText ?? "", 10);
  const minutes = Number.parseInt(minutesText ?? "", 10);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Invalid time value.");
  }

  const year = baseDate.getUTCFullYear();
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getUTCDate()).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T${hh}:${mm}:00+03:00`);
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

export async function listStaffAttendanceRows(user: SessionUser): Promise<ReceptionStaffAttendanceRow[]> {
  const campusId = await resolveCampusId(user.id);
  const today = startOfTodayUtc();

  const staff = await prisma.user.findMany({
    where: {
      campusId,
      isActive: true,
      role: {
        code: {
          in: [RoleCode.PRINCIPAL, RoleCode.RECEPTION, RoleCode.FINANCE, RoleCode.TEACHER]
        }
      }
    },
    orderBy: [{ fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      nationalId: true,
      staffCheckIns: {
        where: { date: today },
        take: 1
      }
    }
  });

  return staff.map(row => {
    const check = row.staffCheckIns[0];
    const status = check?.status === "PRESENT" ? "IN" : "OUT";
    const entryTime = check?.checkInTime?.toISOString() ?? null;
    const outTime = check?.checkOutTime?.toISOString() ?? null;
    const lastActionTime =
      status === "IN"
        ? entryTime
        : (outTime ?? entryTime);

    return {
      userId: row.id,
      staffName: row.fullName,
      staffId: buildStaffId(row),
      status,
      entryTime,
      outTime,
      lastActionTime
    };
  });
}

export async function markStaffAttendance(
  user: SessionUser,
  input: { userId: string; action: "clockIn" | "clockOut" }
) {
  const campusId = await resolveCampusId(user.id);
  const today = startOfTodayUtc();
  const now = new Date();

  if (input.action === "clockIn") {
    await prisma.staffCheckIn.upsert({
      where: { userId_date: { userId: input.userId, date: today } },
      create: {
        campusId,
        userId: input.userId,
        date: today,
        checkInTime: now,
        checkOutTime: null,
        status: "PRESENT"
      },
      update: {
        checkInTime: now,
        checkOutTime: null,
        status: "PRESENT"
      }
    });
    return;
  }

  const existing = await prisma.staffCheckIn.findUnique({
    where: { userId_date: { userId: input.userId, date: today } }
  });

  if (!existing) {
    await prisma.staffCheckIn.create({
      data: {
        campusId,
        userId: input.userId,
        date: today,
        checkInTime: now,
        checkOutTime: now,
        status: "DEPARTED"
      }
    });
    return;
  }

  await prisma.staffCheckIn.update({
    where: { id: existing.id },
    data: {
      checkOutTime: now,
      status: "DEPARTED"
    }
  });
}

export async function updateStaffCheckInTimes(
  userId: string,
  campusId: string,
  entryTime?: string,
  outTime?: string
) {
  const today = startOfTodayUtc();
  const existing = await prisma.staffCheckIn.findFirst({
    where: {
      userId,
      campusId,
      date: today
    }
  });

  if (!existing) {
    throw new Error("No attendance record found for this staff member today.");
  }

  const data: Prisma.StaffCheckInUpdateInput = {};
  if (entryTime) {
    data.checkInTime = buildAttendanceDateTime(existing.date, entryTime);
  }
  if (outTime) {
    data.checkOutTime = buildAttendanceDateTime(existing.date, outTime);
  }

  const nextCheckOutTime =
    (data.checkOutTime instanceof Date ? data.checkOutTime : undefined) ?? existing.checkOutTime;
  data.status = nextCheckOutTime ? "DEPARTED" : "PRESENT";

  return prisma.staffCheckIn.update({
    where: { id: existing.id },
    data
  });
}

export { resolveCampusId };

export async function listTimetableGradeOptions(user: SessionUser): Promise<ReceptionTimetableGradeOption[]> {
  const campusId = await resolveCampusId(user.id);
  const classes = await prisma.schoolClass.findMany({
    where: {
      campusId,
      gradeLevel: { in: [...RECEPTION_TIMETABLE_GRADES] }
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    select: {
      id: true,
      gradeLevel: true,
      isActive: true
    }
  });

  const canManageTimetables = user.role === ROLE.SUPER_ADMIN || user.role === ROLE.PRINCIPAL;
  if (canManageTimetables) {
    for (const gradeLevel of RECEPTION_TIMETABLE_GRADES) {
      const gradeRows = classes.filter(row => row.gradeLevel === gradeLevel);
      const activeRow = gradeRows.find(row => row.isActive);
      if (activeRow) continue;

      const existingRow = gradeRows[0];
      if (existingRow) {
        await prisma.schoolClass.update({
          where: { id: existingRow.id },
          data: { isActive: true }
        });
        continue;
      }

      await prisma.schoolClass.create({
        data: {
          campusId,
          name: gradeLevel,
          gradeLevel,
          isActive: true
        }
      });
    }
  }

  const activeClasses = await prisma.schoolClass.findMany({
    where: {
      campusId,
      isActive: true,
      gradeLevel: { in: [...RECEPTION_TIMETABLE_GRADES] }
    },
    orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    select: {
      id: true,
      gradeLevel: true
    }
  });

  const classByGrade = new Map<string, string>();
  for (const row of activeClasses) {
    if (!classByGrade.has(row.gradeLevel)) {
      classByGrade.set(row.gradeLevel, row.id);
    }
  }

  return RECEPTION_TIMETABLE_GRADES.map(gradeLevel => ({
    gradeLevel,
    classId: classByGrade.get(gradeLevel) ?? null
  }));
}

export async function listClassTimetable(
  user: SessionUser,
  classId: string
): Promise<ReceptionTimetableEntry[]> {
  const campusId = await resolveCampusId(user.id);
  const rows = await prisma.timetable.findMany({
    where: { campusId, classId },
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }]
  });

  return rows.map(item => ({
    id: item.id,
    classId: item.classId,
    dayOfWeek: item.dayOfWeek,
    period: item.period,
    subject: item.subject,
    teacherName: item.teacherName,
    startTime: item.startTime,
    endTime: item.endTime,
    colorHex: normalizeTimetableColorHex(item.colorHex)
  }));
}

export async function upsertTimetableEntry(
  user: SessionUser,
  input: {
    classId: string;
    dayOfWeek: TimetableDayOfWeek;
    period: number;
    subject: string;
    teacherName: string;
    startTime: string;
    endTime: string;
    colorHex: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  return prisma.timetable.upsert({
    where: {
      classId_dayOfWeek_period: {
        classId: input.classId,
        dayOfWeek: input.dayOfWeek,
        period: input.period
      }
    },
    create: {
      campusId,
      classId: input.classId,
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      subject: input.subject,
      teacherName: input.teacherName,
      startTime: input.startTime,
      endTime: input.endTime,
      colorHex: input.colorHex
    },
    update: {
      subject: input.subject,
      teacherName: input.teacherName,
      startTime: input.startTime,
      endTime: input.endTime,
      colorHex: input.colorHex
    }
  });
}

const DEFAULT_TIMETABLE_DAYS: TimetableDayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const DEFAULT_TIMETABLE_PERIODS = [
  { period: 1, startTime: "08:00", endTime: "08:45" },
  { period: 2, startTime: "08:50", endTime: "09:35" },
  { period: 3, startTime: "09:50", endTime: "10:35" },
  { period: 4, startTime: "10:40", endTime: "11:25" },
  { period: 5, startTime: "11:40", endTime: "12:25" },
  { period: 6, startTime: "12:30", endTime: "13:15" },
  { period: 7, startTime: "13:20", endTime: "14:05" },
  { period: 8, startTime: "14:10", endTime: "14:55" }
] as const;

const DEFAULT_TIMETABLE_TEACHER_NAME = "TBD";
const DEFAULT_TIMETABLE_COLOR_HEX = "#E2E8F0";

type TimetableSeedSlot = {
  subject: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  colorHex: string;
};

function toTimetableSlotKey(classId: string, dayOfWeek: TimetableDayOfWeek, period: number) {
  return `${classId}:${dayOfWeek}:${period}`;
}

function isSameTimetableSlot(
  existing: {
    subject: string;
    teacherName: string;
    startTime: string;
    endTime: string;
    colorHex: string;
  },
  incoming: TimetableSeedSlot
) {
  return (
    existing.subject === incoming.subject &&
    existing.teacherName === incoming.teacherName &&
    existing.startTime === incoming.startTime &&
    existing.endTime === incoming.endTime &&
    normalizeTimetableColorHex(existing.colorHex) === incoming.colorHex
  );
}

export async function seedDefaultTimetableForActiveClasses(
  user: SessionUser
): Promise<BulkTimetableSeedResult> {
  const campusId = await resolveCampusId(user.id);
  const activeClasses = await prisma.schoolClass.findMany({
    where: { campusId, isActive: true },
    select: { id: true }
  });

  const classIds = activeClasses.map(item => item.id);
  if (classIds.length === 0) {
    return {
      classesProcessed: 0,
      slotsCreated: 0,
      slotsUpdated: 0,
      slotsUnchanged: 0
    };
  }

  const existingRows = await prisma.timetable.findMany({
    where: {
      campusId,
      classId: { in: classIds }
    },
    select: {
      id: true,
      classId: true,
      dayOfWeek: true,
      period: true,
      subject: true,
      teacherName: true,
      startTime: true,
      endTime: true,
      colorHex: true
    }
  });

  const existingBySlot = new Map(
    existingRows.map(row => [toTimetableSlotKey(row.classId, row.dayOfWeek, row.period), row])
  );

  const creates: Prisma.TimetableCreateManyInput[] = [];
  const updates: Array<{ id: string; data: TimetableSeedSlot }> = [];
  let slotsUnchanged = 0;

  for (const classId of classIds) {
    for (const dayOfWeek of DEFAULT_TIMETABLE_DAYS) {
      for (const periodSlot of DEFAULT_TIMETABLE_PERIODS) {
        const desiredSlot: TimetableSeedSlot = {
          subject: `Period ${periodSlot.period} Subject`,
          teacherName: DEFAULT_TIMETABLE_TEACHER_NAME,
          startTime: periodSlot.startTime,
          endTime: periodSlot.endTime,
          colorHex: DEFAULT_TIMETABLE_COLOR_HEX
        };
        const existing = existingBySlot.get(toTimetableSlotKey(classId, dayOfWeek, periodSlot.period));

        if (!existing) {
          creates.push({
            campusId,
            classId,
            dayOfWeek,
            period: periodSlot.period,
            subject: desiredSlot.subject,
            teacherName: desiredSlot.teacherName,
            startTime: desiredSlot.startTime,
            endTime: desiredSlot.endTime,
            colorHex: desiredSlot.colorHex
          });
          continue;
        }

        if (isSameTimetableSlot(existing, desiredSlot)) {
          slotsUnchanged += 1;
          continue;
        }

        updates.push({
          id: existing.id,
          data: desiredSlot
        });
      }
    }
  }

  if (creates.length > 0) {
    await prisma.timetable.createMany({ data: creates });
  }

  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map(update =>
        prisma.timetable.update({
          where: { id: update.id },
          data: update.data
        })
      )
    );
  }

  return {
    classesProcessed: classIds.length,
    slotsCreated: creates.length,
    slotsUpdated: updates.length,
    slotsUnchanged
  };
}

export async function updateTimetableEntry(
  user: SessionUser,
  input: {
    id: string;
    subject?: string;
    teacherName?: string;
    startTime?: string;
    endTime?: string;
    colorHex?: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  return prisma.timetable.updateMany({
    where: { id: input.id, campusId },
    data: {
      subject: input.subject,
      teacherName: input.teacherName,
      startTime: input.startTime,
      endTime: input.endTime,
      colorHex: input.colorHex
    }
  });
}

export async function deleteTimetableEntry(user: SessionUser, id: string) {
  const campusId = await resolveCampusId(user.id);
  return prisma.timetable.deleteMany({
    where: { id, campusId }
  });
}

export async function listReceptionDocumentStudents(
  user: SessionUser,
  filters?: { query?: string; studentId?: string }
): Promise<ReceptionStudentDocumentRow[]> {
  const campusId = await resolveCampusId(user.id);
  const q = filters?.query?.trim();
  const whereSearch =
    q && q.length > 0
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { studentCode: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : undefined;

  const students = await prisma.student.findMany({
    where: {
      campusId,
      isActive: true,
      ...(filters?.studentId ? { id: filters.studentId } : {}),
      ...whereSearch
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: {
      schoolClass: {
        select: {
          gradeLevel: true
        }
      },
      documents: {
        where: {
          documentType: { in: [...RECEPTION_DOCUMENT_TYPES] }
        },
        orderBy: [{ updatedAt: "desc" }]
      }
    }
  });

  return students.map(student => {
    const fullName = `${student.firstName} ${student.lastName}`.trim();
    const latestByType = new Map<string, (typeof student.documents)[number]>();
    for (const doc of student.documents) {
      if (!latestByType.has(doc.documentType)) {
        latestByType.set(doc.documentType, doc);
      }
    }

    const documents = RECEPTION_DOCUMENT_TYPES.map(documentType => {
      const doc = latestByType.get(documentType);
      return {
        id: doc?.id ?? null,
        documentType,
        fileName: doc?.fileName ?? null,
        status: doc?.status ?? null,
        uploadedAt: doc?.uploadedAt?.toISOString() ?? null,
        storagePath: doc?.storagePath ?? null
      };
    });

    return {
      studentId: student.id,
      displayStudentId: toDisplayStudentId(student.studentCode),
      studentName: fullName,
      gradeLevel: student.schoolClass?.gradeLevel ?? "Unassigned",
      documents
    };
  });
}

export async function upsertReceptionStudentDocument(
  user: SessionUser,
  input: {
    studentId: string;
    documentType: (typeof RECEPTION_DOCUMENT_TYPES)[number];
    fileName: string;
    storagePath: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, campusId },
    select: { id: true }
  });
  if (!student) {
    throw new Error("Student not found for this campus.");
  }

  const existing = await prisma.studentDocument.findFirst({
    where: {
      campusId,
      studentId: input.studentId,
      documentType: input.documentType
    },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true }
  });

  if (existing) {
    await prisma.studentDocument.update({
      where: { id: existing.id },
      data: {
        fileName: input.fileName,
        storagePath: input.storagePath,
        status: "UPLOADED",
        uploadedAt: new Date(),
        rejectedAt: null
      }
    });
    return existing.id;
  }

  const created = await prisma.studentDocument.create({
    data: {
      campusId,
      studentId: input.studentId,
      documentType: input.documentType,
      fileName: input.fileName,
      storagePath: input.storagePath,
      status: "UPLOADED",
      uploadedAt: new Date()
    },
    select: { id: true }
  });
  return created.id;
}

export async function listTodaysIncidentsByUser(user: SessionUser): Promise<ReceptionIncidentLogItem[]> {
  const campusId = await resolveCampusId(user.id);
  const today = startOfTodayUtc();
  const tomorrow = endOfTodayUtc();

  const rows = await prisma.incidentReport.findMany({
    where: {
      campusId,
      loggedByUserId: user.id,
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  return rows.map(row => ({
    id: row.id,
    type: row.type,
    personName: row.personName,
    description: row.description,
    priority: toReceptionPriority(row.priority),
    targetDepartment: row.targetDepartment,
    createdAt: row.createdAt.toISOString()
  }));
}

export async function createReceptionIncident(
  user: SessionUser,
  input: {
    incidentType: "Safety" | "Complaint" | "Maintenance" | "Medical" | "Other";
    personName?: string;
    description: string;
    priority: "Low" | "Medium" | "Urgent";
  }
) {
  const campusId = await resolveCampusId(user.id);
  const incident = await prisma.incidentReport.create({
    data: {
      campusId,
      type: input.incidentType,
      personName: input.personName?.trim() || null,
      description: input.description,
      reportedBy: user.fullName,
      department: "Principal Office",
      targetDepartment: "PRINCIPAL",
      priority: toPriorityDb(input.priority),
      loggedByUserId: user.id,
      status: "PENDING",
      routedAt: new Date()
    },
    select: {
      id: true,
      type: true,
      personName: true,
      description: true,
      priority: true,
      createdAt: true
    }
  });
  return incident;
}

import type {
  AppointmentStatus,
  IncidentStatus,
  LostFoundStatus,
  Prisma,
  StaffCheckInStatus
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { SessionUser } from "@/lib/auth/types";
import {
  REQUIRED_RECEPTION_DOCUMENT_TYPES,
  type AppointmentItem,
  type EarlyPickupLogItem,
  type EarlyPickupStudentProfile,
  type GatePassItem,
  type IncidentBoardItem,
  type InquiryBoardItem,
  type LostFoundItemView,
  type ReceptionDashboardData,
  type ReceptionSearchResults,
  type StaffCheckInRow,
  type StudentDocumentIntakeItem,
  type StudentDocumentOverview
} from "@/lib/reception/types";

const DEPARTMENT_BY_ROLE_CODE: Record<string, string> = {
  SUPER_ADMIN: "Administration",
  PRINCIPAL: "School Leadership",
  RECEPTION: "Front Desk",
  FINANCE: "Finance",
  ACCOUNTANT: "Finance",
  TEACHER: "Academics",
  MAINTENANCE: "Operations",
  DRIVER: "Transport",
  ADMIN_SUPPORT: "Administration"
};

function getRoleDepartment(roleCode: string) {
  return DEPARTMENT_BY_ROLE_CODE[roleCode] ?? "General";
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toDateOnlyUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isToday(value: Date) {
  return toDateOnlyUtc(value).getTime() === startOfTodayUtc().getTime();
}

function createPrefixNumber(prefix: string) {
  const seed = Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${date}-${seed}`;
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

function studentFullName(student: { firstName: string; lastName: string }) {
  return `${student.firstName} ${student.lastName}`.trim();
}

export async function getReceptionDashboard(user: SessionUser): Promise<ReceptionDashboardData> {
  const campusId = await resolveCampusId(user.id);
  const today = startOfTodayUtc();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [
    studentsCount,
    guardiansCount,
    staffCount,
    onSiteStaffCount,
    incidents,
    visitors,
    earlyPickupsToday,
    appointmentsToday,
    missingDocStudents
  ] = await Promise.all([
    prisma.student.count({ where: { campusId } }),
    prisma.guardian.count({ where: { campusId } }),
    prisma.user.count({ where: { campusId, isActive: true } }),
    prisma.staffCheckIn.count({
      where: { campusId, date: today, status: "PRESENT", checkOutTime: null }
    }),
    prisma.incidentReport.findMany({
      where: { campusId },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.gatePass.findMany({
      where: { campusId, checkInTime: { gte: today, lt: tomorrow } },
      orderBy: { checkInTime: "desc" },
      take: 8
    }),
    prisma.earlyPickup.count({
      where: { campusId, checkOutTime: { gte: today, lt: tomorrow } }
    }),
    prisma.appointment.count({
      where: { campusId, scheduledAt: { gte: today, lt: tomorrow } }
    }),
    prisma.student.findMany({
      where: { campusId, isActive: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 20,
      include: {
        documents: {
          where: { status: { in: ["UPLOADED", "VERIFIED"] } },
          select: { documentType: true }
        },
        studentLinks: {
          include: {
            guardian: {
              select: { id: true, fullName: true, phoneNumber: true, nationalId: true }
            }
          }
        }
      }
    })
  ]);

  const studentsWithMissingDocs = missingDocStudents
    .map(student => {
      const uploadedDocuments = Array.from(new Set(student.documents.map(document => document.documentType)));
      const missingDocuments = REQUIRED_RECEPTION_DOCUMENT_TYPES.filter(
        docType => !uploadedDocuments.includes(docType)
      );
      return {
        id: student.id,
        studentCode: student.studentCode,
        fullName: studentFullName(student),
        nationalId: student.nationalId,
        phoneNumber: student.studentLinks[0]?.guardian.phoneNumber ?? null,
        guardians: student.studentLinks.map(link => ({
          id: link.guardian.id,
          fullName: link.guardian.fullName,
          phoneNumber: link.guardian.phoneNumber,
          nationalId: link.guardian.nationalId
        })),
        uploadedDocuments,
        missingDocuments
      };
    })
    .filter(item => item.missingDocuments.length > 0)
    .slice(0, 8);

  return {
    stats: {
      students: studentsCount,
      guardians: guardiansCount,
      staff: staffCount,
      onSiteStaff: onSiteStaffCount,
      openIncidents: incidents.filter(incident => incident.status !== "RESOLVED").length,
      activeVisitors: visitors.filter(visitor => visitor.status === "ON_CAMPUS").length,
      earlyPickupsToday,
      appointmentsToday
    },
    studentsWithMissingDocs,
    recentIncidents: incidents.map(incident => ({
      id: incident.id,
      type: incident.type,
      reportedBy: incident.reportedBy,
      department: incident.department,
      status: incident.status,
      createdAt: incident.createdAt.toISOString()
    })),
    todayVisitors: visitors.map(visitor => ({
      id: visitor.id,
      visitorName: visitor.visitorName,
      purpose: visitor.purpose,
      personToMeet: visitor.personToMeet,
      checkInTime: visitor.checkInTime.toISOString(),
      checkOutTime: visitor.checkOutTime ? visitor.checkOutTime.toISOString() : null,
      status: visitor.status,
      passNumber: visitor.passNumber
    }))
  };
}

export async function searchReceptionDirectory(user: SessionUser, query: string): Promise<ReceptionSearchResults> {
  const campusId = await resolveCampusId(user.id);
  const normalized = query.trim();
  if (normalized.length < 2) {
    return { students: [], guardians: [], staff: [] };
  }

  const [students, guardians, staff] = await Promise.all([
    prisma.student.findMany({
      where: {
        campusId,
        OR: [
          { firstName: { contains: normalized, mode: "insensitive" } },
          { lastName: { contains: normalized, mode: "insensitive" } },
          { studentCode: { contains: normalized, mode: "insensitive" } },
          { nationalId: { contains: normalized, mode: "insensitive" } }
        ]
      },
      take: 10,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        documents: {
          where: { status: { in: ["UPLOADED", "VERIFIED"] } },
          select: { documentType: true }
        },
        studentLinks: {
          include: {
            guardian: {
              select: { id: true, fullName: true, phoneNumber: true, nationalId: true }
            }
          }
        }
      }
    }),
    prisma.guardian.findMany({
      where: {
        campusId,
        OR: [
          { fullName: { contains: normalized, mode: "insensitive" } },
          { guardianCode: { contains: normalized, mode: "insensitive" } },
          { phoneNumber: { contains: normalized, mode: "insensitive" } },
          { nationalId: { contains: normalized, mode: "insensitive" } }
        ]
      },
      take: 10,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        students: {
          include: { student: { select: { id: true, firstName: true, lastName: true, studentCode: true } } }
        }
      }
    }),
    prisma.user.findMany({
      where: {
        campusId,
        isActive: true,
        OR: [
          { fullName: { contains: normalized, mode: "insensitive" } },
          { email: { contains: normalized, mode: "insensitive" } },
          { phoneNumber: { contains: normalized, mode: "insensitive" } },
          { nationalId: { contains: normalized, mode: "insensitive" } }
        ]
      },
      take: 10,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        role: { select: { code: true, name: true } },
        staffCheckIns: {
          where: { date: startOfTodayUtc() },
          select: { status: true },
          take: 1
        }
      }
    })
  ]);

  return {
    students: students.map(student => {
      const uploadedDocuments = Array.from(new Set(student.documents.map(doc => doc.documentType)));
      const missingDocuments = REQUIRED_RECEPTION_DOCUMENT_TYPES.filter(
        docType => !uploadedDocuments.includes(docType)
      );
      return {
        id: student.id,
        studentCode: student.studentCode,
        fullName: studentFullName(student),
        nationalId: student.nationalId,
        phoneNumber: student.studentLinks[0]?.guardian.phoneNumber ?? null,
        guardians: student.studentLinks.map(link => ({
          id: link.guardian.id,
          fullName: link.guardian.fullName,
          phoneNumber: link.guardian.phoneNumber,
          nationalId: link.guardian.nationalId
        })),
        uploadedDocuments,
        missingDocuments
      };
    }),
    guardians: guardians.map(guardian => ({
      id: guardian.id,
      guardianCode: guardian.guardianCode,
      fullName: guardian.fullName,
      nationalId: guardian.nationalId,
      phoneNumber: guardian.phoneNumber,
      linkedStudents: guardian.students.map(link => ({
        id: link.student.id,
        fullName: studentFullName(link.student),
        studentCode: link.student.studentCode
      }))
    })),
    staff: staff.map(userRow => ({
      id: userRow.id,
      fullName: userRow.fullName,
      email: userRow.email,
      role: userRow.role.name,
      department: getRoleDepartment(userRow.role.code),
      nationalId: userRow.nationalId,
      phoneNumber: userRow.phoneNumber,
      checkedInToday: userRow.staffCheckIns[0]?.status === "PRESENT"
    }))
  };
}

export async function listStaffCheckIns(
  user: SessionUser,
  filters?: { role?: string; department?: string }
): Promise<{ rows: StaffCheckInRow[]; onSiteCount: number }> {
  const campusId = await resolveCampusId(user.id);
  const today = startOfTodayUtc();

  const staffUsers = await prisma.user.findMany({
    where: {
      campusId,
      isActive: true,
      role: filters?.role ? { name: filters.role } : undefined
    },
    orderBy: [{ fullName: "asc" }],
    include: {
      role: { select: { code: true, name: true } },
      staffCheckIns: {
        where: { date: today },
        take: 1
      }
    }
  });

  const rows = staffUsers
    .map(staff => {
      const checkIn = staff.staffCheckIns[0];
      return {
        userId: staff.id,
        fullName: staff.fullName,
        role: staff.role.name,
        department: getRoleDepartment(staff.role.code),
        phoneNumber: staff.phoneNumber,
        status: checkIn?.status ?? "DEPARTED",
        checkInTime: checkIn?.checkInTime ? checkIn.checkInTime.toISOString() : null,
        checkOutTime: checkIn?.checkOutTime ? checkIn.checkOutTime.toISOString() : null
      } satisfies StaffCheckInRow;
    })
    .filter(row => !filters?.department || row.department === filters.department);

  return {
    rows,
    onSiteCount: rows.filter(row => row.status === "PRESENT").length
  };
}

export async function markStaffCheck(
  user: SessionUser,
  payload: { userId: string; action: "checkIn" | "checkOut" }
) {
  const campusId = await resolveCampusId(user.id);
  const today = startOfTodayUtc();
  const now = new Date();

  if (payload.action === "checkIn") {
    await prisma.staffCheckIn.upsert({
      where: { userId_date: { userId: payload.userId, date: today } },
      create: {
        campusId,
        userId: payload.userId,
        date: today,
        checkInTime: now,
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
    where: { userId_date: { userId: payload.userId, date: today } }
  });

  if (!existing) {
    await prisma.staffCheckIn.create({
      data: {
        campusId,
        userId: payload.userId,
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

export async function listIncidents(user: SessionUser): Promise<IncidentBoardItem[]> {
  const campusId = await resolveCampusId(user.id);
  const incidents = await prisma.incidentReport.findMany({
    where: { campusId },
    orderBy: [{ createdAt: "desc" }],
    take: 100
  });
  return incidents.map(incident => ({
    id: incident.id,
    type: incident.type,
    description: incident.description,
    reportedBy: incident.reportedBy,
    department: incident.department,
    status: incident.status,
    routedAt: incident.routedAt?.toISOString() ?? null,
    resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    createdAt: incident.createdAt.toISOString()
  }));
}

export async function createIncident(
  user: SessionUser,
  input: { type: string; description: string; reportedBy: string; department: string }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.incidentReport.create({
    data: {
      campusId,
      type: input.type,
      description: input.description,
      reportedBy: input.reportedBy,
      department: input.department,
      status: "PENDING",
      routedAt: new Date()
    }
  });
}

export async function updateIncidentStatus(
  user: SessionUser,
  input: { id: string; status: IncidentStatus }
) {
  const campusId = await resolveCampusId(user.id);
  const now = new Date();
  await prisma.incidentReport.updateMany({
    where: { id: input.id, campusId },
    data: {
      status: input.status,
      routedAt: input.status === "IN_PROGRESS" ? now : undefined,
      resolvedAt: input.status === "RESOLVED" ? now : input.status === "PENDING" ? null : undefined
    }
  });
}

export async function listInquiries(user: SessionUser): Promise<InquiryBoardItem[]> {
  const campusId = await resolveCampusId(user.id);
  const inquiries = await prisma.inquiryLog.findMany({
    where: { campusId },
    orderBy: [{ createdAt: "desc" }],
    take: 100
  });
  return inquiries.map(inquiry => ({
    id: inquiry.id,
    callerName: inquiry.callerName,
    callerPhone: inquiry.callerPhone,
    subject: inquiry.subject,
    notes: inquiry.notes,
    followUpDate: inquiry.followUpDate?.toISOString() ?? null,
    status: inquiry.status,
    createdAt: inquiry.createdAt.toISOString()
  }));
}

export async function createInquiry(
  user: SessionUser,
  input: {
    callerName: string;
    callerPhone?: string;
    subject: string;
    notes?: string;
    followUpDate?: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.inquiryLog.create({
    data: {
      campusId,
      callerName: input.callerName,
      callerPhone: input.callerPhone?.trim() || null,
      subject: input.subject,
      notes: input.notes?.trim() || null,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
      status: "PENDING"
    }
  });
}

export async function updateInquiryStatus(
  user: SessionUser,
  input: { id: string; status: string }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.inquiryLog.updateMany({
    where: { id: input.id, campusId },
    data: { status: input.status }
  });
}

export async function listGatePasses(user: SessionUser): Promise<GatePassItem[]> {
  const campusId = await resolveCampusId(user.id);
  const passes = await prisma.gatePass.findMany({
    where: { campusId },
    orderBy: [{ checkInTime: "desc" }],
    take: 150
  });

  return passes.map(pass => ({
    id: pass.id,
    visitorName: pass.visitorName,
    visitorId: pass.visitorId,
    purpose: pass.purpose,
    personToMeet: pass.personToMeet,
    department: pass.department,
    passNumber: pass.passNumber,
    checkInTime: pass.checkInTime.toISOString(),
    checkOutTime: pass.checkOutTime ? pass.checkOutTime.toISOString() : null,
    status: pass.status
  }));
}

export async function createGatePass(
  user: SessionUser,
  input: {
    visitorName: string;
    visitorId: string;
    purpose: string;
    personToMeet: string;
    department: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.gatePass.create({
    data: {
      campusId,
      visitorName: input.visitorName,
      visitorId: input.visitorId,
      purpose: input.purpose,
      personToMeet: input.personToMeet,
      department: input.department,
      passNumber: createPrefixNumber("GP"),
      status: "ON_CAMPUS"
    }
  });
}

export async function checkoutGatePass(user: SessionUser, gatePassId: string) {
  const campusId = await resolveCampusId(user.id);
  await prisma.gatePass.updateMany({
    where: { id: gatePassId, campusId },
    data: {
      checkOutTime: new Date(),
      status: "DEPARTED"
    }
  });
}

export async function searchStudentsForEarlyPickup(
  user: SessionUser,
  query: string
): Promise<EarlyPickupStudentProfile[]> {
  const campusId = await resolveCampusId(user.id);
  const normalized = query.trim();
  if (normalized.length < 2) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: {
      campusId,
      OR: [
        { firstName: { contains: normalized, mode: "insensitive" } },
        { lastName: { contains: normalized, mode: "insensitive" } },
        { studentCode: { contains: normalized, mode: "insensitive" } }
      ]
    },
    include: {
      studentLinks: {
        include: {
          guardian: { select: { id: true, fullName: true, phoneNumber: true, nationalId: true } }
        }
      }
    },
    take: 10,
    orderBy: [{ updatedAt: "desc" }]
  });

  return students.map(student => ({
    id: student.id,
    fullName: studentFullName(student),
    studentCode: student.studentCode,
    authorizedGuardians: student.studentLinks.map(link => ({
      id: link.guardian.id,
      fullName: link.guardian.fullName,
      phoneNumber: link.guardian.phoneNumber,
      nationalId: link.guardian.nationalId
    }))
  }));
}

export async function issueEarlyPickup(
  user: SessionUser,
  input: { studentId: string; guardianId: string; notes?: string }
) {
  const campusId = await resolveCampusId(user.id);
  const link = await prisma.studentGuardian.findUnique({
    where: { studentId_guardianId: { studentId: input.studentId, guardianId: input.guardianId } }
  });
  if (!link) {
    throw new Error("Guardian is not authorized for this student.");
  }

  await prisma.earlyPickup.create({
    data: {
      campusId,
      studentId: input.studentId,
      guardianId: input.guardianId,
      verifiedById: user.id,
      checkOutTime: new Date(),
      releasePassNumber: createPrefixNumber("ERP"),
      notes: input.notes?.trim() || null
    }
  });
}

export async function listEarlyPickups(user: SessionUser): Promise<EarlyPickupLogItem[]> {
  const campusId = await resolveCampusId(user.id);
  const pickups = await prisma.earlyPickup.findMany({
    where: { campusId },
    include: {
      student: { select: { firstName: true, lastName: true, studentCode: true } },
      guardian: { select: { fullName: true, nationalId: true } },
      verifiedBy: { select: { fullName: true } }
    },
    orderBy: [{ checkOutTime: "desc" }],
    take: 120
  });

  return pickups.map(item => ({
    id: item.id,
    studentName: studentFullName(item.student),
    studentCode: item.student.studentCode,
    guardianName: item.guardian.fullName,
    guardianNationalId: item.guardian.nationalId,
    verifiedByName: item.verifiedBy.fullName,
    checkOutTime: item.checkOutTime.toISOString(),
    releasePassNumber: item.releasePassNumber,
    notes: item.notes
  }));
}

export async function listAppointments(user: SessionUser): Promise<AppointmentItem[]> {
  const campusId = await resolveCampusId(user.id);
  const rows = await prisma.appointment.findMany({
    where: { campusId },
    orderBy: [{ scheduledAt: "asc" }],
    take: 150
  });
  return rows.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    parentName: item.parentName,
    parentPhone: item.parentPhone,
    meetingWith: item.meetingWith,
    scheduledAt: item.scheduledAt.toISOString(),
    status: item.status
  }));
}

export async function createAppointment(
  user: SessionUser,
  input: {
    title: string;
    description?: string;
    parentName: string;
    parentPhone?: string;
    meetingWith: string;
    scheduledAt: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.appointment.create({
    data: {
      campusId,
      title: input.title,
      description: input.description?.trim() || null,
      parentName: input.parentName,
      parentPhone: input.parentPhone?.trim() || null,
      meetingWith: input.meetingWith,
      scheduledAt: new Date(input.scheduledAt),
      status: "SCHEDULED"
    }
  });
}

export async function updateAppointmentStatus(
  user: SessionUser,
  input: { id: string; status: AppointmentStatus }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.appointment.updateMany({
    where: { id: input.id, campusId },
    data: { status: input.status }
  });
}

export async function listLostFoundItems(user: SessionUser): Promise<LostFoundItemView[]> {
  const campusId = await resolveCampusId(user.id);
  const items = await prisma.lostFoundItem.findMany({
    where: { campusId },
    orderBy: [{ foundDate: "desc" }],
    take: 200
  });

  return items.map(item => ({
    id: item.id,
    description: item.description,
    foundBy: item.foundBy,
    foundDate: item.foundDate.toISOString(),
    location: item.location,
    status: item.status,
    claimedBy: item.claimedBy,
    claimedAt: item.claimedAt ? item.claimedAt.toISOString() : null
  }));
}

export async function createLostFoundItem(
  user: SessionUser,
  input: { description: string; foundBy: string; location: string; foundDate?: string }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.lostFoundItem.create({
    data: {
      campusId,
      description: input.description,
      foundBy: input.foundBy,
      location: input.location,
      foundDate: input.foundDate ? new Date(input.foundDate) : new Date(),
      status: "UNCLAIMED"
    }
  });
}

export async function updateLostFoundStatus(
  user: SessionUser,
  input: { id: string; status: LostFoundStatus; claimedBy?: string }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.lostFoundItem.updateMany({
    where: { id: input.id, campusId },
    data: {
      status: input.status,
      claimedBy: input.status === "CLAIMED" ? input.claimedBy?.trim() || "Verified claimant" : null,
      claimedAt: input.status === "CLAIMED" ? new Date() : null
    }
  });
}

export async function listStudentDocumentOverview(user: SessionUser): Promise<StudentDocumentOverview[]> {
  const campusId = await resolveCampusId(user.id);
  const students = await prisma.student.findMany({
    where: { campusId, isActive: true },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      documents: {
        where: { status: { in: ["UPLOADED", "VERIFIED"] } },
        select: { documentType: true }
      }
    },
    take: 80
  });

  return students.map(student => {
    const uploadedDocuments = Array.from(new Set(student.documents.map(item => item.documentType)));
    return {
      studentId: student.id,
      studentName: studentFullName(student),
      studentCode: student.studentCode,
      uploadedDocuments,
      missingDocuments: REQUIRED_RECEPTION_DOCUMENT_TYPES.filter(
        docType => !uploadedDocuments.includes(docType)
      )
    };
  });
}

export async function listStudentDocuments(user: SessionUser): Promise<StudentDocumentIntakeItem[]> {
  const campusId = await resolveCampusId(user.id);
  const rows = await prisma.studentDocument.findMany({
    where: { campusId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentCode: true } }
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    take: 200
  });

  return rows.map(item => ({
    id: item.id,
    studentId: item.studentId,
    studentName: studentFullName(item.student),
    studentCode: item.student.studentCode,
    documentType: item.documentType,
    fileName: item.fileName,
    status: item.status,
    uploadedAt: item.uploadedAt ? item.uploadedAt.toISOString() : null,
    notes: item.notes
  }));
}

export async function intakeStudentDocument(
  user: SessionUser,
  input: {
    studentId: string;
    documentType: string;
    fileName?: string;
    notes?: string;
  }
) {
  const campusId = await resolveCampusId(user.id);
  await prisma.studentDocument.create({
    data: {
      campusId,
      studentId: input.studentId,
      documentType: input.documentType,
      status: "UPLOADED",
      fileName: input.fileName?.trim() || null,
      storagePath: input.fileName ? `/uploads/reception/${Date.now()}-${input.fileName}` : null,
      uploadedAt: new Date(),
      notes: input.notes?.trim() || null
    }
  });
}

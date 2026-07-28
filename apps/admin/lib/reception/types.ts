import type {
  AppointmentStatus,
  IncidentStatus,
  LostFoundStatus,
  StaffCheckInStatus
} from "@prisma/client";

export const REQUIRED_RECEPTION_DOCUMENT_TYPES = [
  "Birth Certificate",
  "National ID",
  "Medical Record",
  "Transcript",
  "Photo"
] as const;

export type ReceptionDocumentType = (typeof REQUIRED_RECEPTION_DOCUMENT_TYPES)[number];

export type ReceptionDashboardStats = {
  students: number;
  guardians: number;
  staff: number;
  onSiteStaff: number;
  openIncidents: number;
  activeVisitors: number;
  earlyPickupsToday: number;
  appointmentsToday: number;
};

export type ReceptionStudentSearchResult = {
  id: string;
  studentCode: string;
  fullName: string;
  nationalId: string | null;
  phoneNumber: string | null;
  guardians: Array<{
    id: string;
    fullName: string;
    phoneNumber: string;
    nationalId: string | null;
  }>;
  uploadedDocuments: string[];
  missingDocuments: string[];
};

export type ReceptionGuardianSearchResult = {
  id: string;
  guardianCode: string;
  fullName: string;
  nationalId: string | null;
  phoneNumber: string;
  linkedStudents: Array<{ id: string; fullName: string; studentCode: string }>;
};

export type ReceptionStaffSearchResult = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  nationalId: string | null;
  phoneNumber: string | null;
  checkedInToday: boolean;
};

export type ReceptionDashboardData = {
  stats: ReceptionDashboardStats;
  studentsWithMissingDocs: ReceptionStudentSearchResult[];
  recentIncidents: Array<{
    id: string;
    type: string;
    reportedBy: string;
    department: string;
    status: IncidentStatus;
    createdAt: string;
  }>;
  todayVisitors: Array<{
    id: string;
    visitorName: string;
    purpose: string;
    personToMeet: string;
    checkInTime: string;
    checkOutTime: string | null;
    status: string;
    passNumber: string;
  }>;
};

export type ReceptionSearchResults = {
  students: ReceptionStudentSearchResult[];
  guardians: ReceptionGuardianSearchResult[];
  staff: ReceptionStaffSearchResult[];
};

export type StaffCheckInRow = {
  userId: string;
  fullName: string;
  role: string;
  department: string;
  phoneNumber: string | null;
  status: StaffCheckInStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
};

export type IncidentBoardItem = {
  id: string;
  type: string;
  description: string;
  reportedBy: string;
  department: string;
  status: IncidentStatus;
  routedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type InquiryBoardItem = {
  id: string;
  callerName: string;
  callerPhone: string | null;
  subject: string;
  notes: string | null;
  followUpDate: string | null;
  status: string;
  createdAt: string;
};

export type GatePassItem = {
  id: string;
  visitorName: string;
  visitorId: string;
  purpose: string;
  personToMeet: string;
  department: string;
  passNumber: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
};

export type AuthorizedGuardian = {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string | null;
};

export type EarlyPickupStudentProfile = {
  id: string;
  fullName: string;
  studentCode: string;
  authorizedGuardians: AuthorizedGuardian[];
};

export type EarlyPickupLogItem = {
  id: string;
  studentName: string;
  studentCode: string;
  guardianName: string;
  guardianNationalId: string | null;
  verifiedByName: string;
  checkOutTime: string;
  releasePassNumber: string;
  notes: string | null;
};

export type AppointmentItem = {
  id: string;
  title: string;
  description: string | null;
  parentName: string;
  parentPhone: string | null;
  meetingWith: string;
  scheduledAt: string;
  status: AppointmentStatus;
};

export type LostFoundItemView = {
  id: string;
  description: string;
  foundBy: string;
  foundDate: string;
  location: string;
  status: LostFoundStatus;
  claimedBy: string | null;
  claimedAt: string | null;
};

export type StudentDocumentIntakeItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  documentType: string;
  fileName: string | null;
  status: string;
  uploadedAt: string | null;
  notes: string | null;
};

export type StudentDocumentOverview = {
  studentId: string;
  studentName: string;
  studentCode: string;
  uploadedDocuments: string[];
  missingDocuments: string[];
};

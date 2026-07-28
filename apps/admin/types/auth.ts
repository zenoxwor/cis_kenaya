/** Attendance statuses */
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

/** Correction request statuses */
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Attendance period statuses */
export type AttendancePeriodStatus = "OPEN" | "CLOSED";

/** Attendance-module role subset (lowercase, maps to foundation AppRole) */
export type Role = "viewer" | "reception" | "admin" | "principal" | "superadmin";

export interface SessionUser {
  id: string;
  username: string;
  displayName?: string;
  role: Role;
  createdAt: string;
}

export interface AdminSession {
  user?: SessionUser;
}

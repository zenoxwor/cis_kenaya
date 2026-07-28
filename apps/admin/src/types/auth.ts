/**
 * Roles (ordered by privilege, highest first):
 *   superadmin  – full access; can manage users, approve corrections
 *   principal   – school principal; can approve corrections, view all reports
 *   admin       – standard admin; can manage students, run operations
 *   reception   – front-desk staff; can mark and view attendance
 *   viewer      – read-only access to dashboards and reports
 */
export type Role = "viewer" | "reception" | "admin" | "principal" | "superadmin";

export interface SessionUser {
  id: string;
  username: string;
  displayName?: string;
  role: Role;
  /** ISO timestamp of when the session was created */
  createdAt: string;
}

export interface AdminSession {
  user?: SessionUser;
}

/** Auth modes */
export type AuthMode = "mock" | "external";

/** Attendance statuses */
export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

/** Correction request statuses */
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Attendance period statuses */
export type AttendancePeriodStatus = "OPEN" | "CLOSED";


/**
 * Shared attendance constants and helpers.
 */

export type { AttendanceStatus, CorrectionStatus, AttendancePeriodStatus } from "@/types/auth";
import type { AttendanceStatus } from "@/types/auth";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
];

/** Display labels for attendance status values. */
export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  EXCUSED: "Excused",
};

/** Tailwind-style color tokens for attendance status (inline styles). */
export const STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
  PRESENT: { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  LATE: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  ABSENT: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  EXCUSED: { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
};

/** CIS Kenya brand colors. */
export const BRAND = {
  navy: "#1a1a1a",
  navyLight: "#242424",
  gold: "#C5A028",
  goldLight: "#E8BC2C",
  red: "#CC1F1F",   // Kenyan flag red
  green: "#006600", // Kenyan flag green
  white: "#FFFFFF",
  offWhite: "#F9FAFB",
  border: "#E5E7EB",
  textMuted: "#6B7280",
  textDark: "#111827",
};

/** Returns midnight UTC for a given date string or Date. */
export function toDateOnly(date: string | Date): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Formats a Date to YYYY-MM-DD string. */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns today as a YYYY-MM-DD string (local time). */
export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Threshold for at-risk: absences in past N days. */
export const AT_RISK_THRESHOLD = 3;
export const AT_RISK_WINDOW_DAYS = 7;

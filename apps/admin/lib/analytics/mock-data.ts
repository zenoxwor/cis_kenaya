import type { DateRangeValue, FilterOption } from "@/lib/analytics/types";

type BaseRecord = {
  date: string;
  classId: string;
  termId: string;
};

export type EnrollmentRecord = BaseRecord & {
  leads: number;
  qualified: number;
  applied: number;
  enrolled: number;
};

export type AttendanceRiskRecord = BaseRecord & {
  atRiskLearners: number;
  atRiskRate: number;
};

export type FinanceHealthRecord = BaseRecord & {
  paidCount: number;
  overdueCount: number;
  paidAmount: number;
  overdueAmount: number;
};

export type AcademicTrendRecord = BaseRecord & {
  averageScore: number;
  passRate: number;
};

export type CommunicationsRecord = BaseRecord & {
  delivered: number;
  opened: number;
  acknowledged: number;
  failed: number;
};

export const DATE_RANGE_OPTIONS: FilterOption[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" }
];

export const DEFAULT_DATE_RANGE: DateRangeValue = "30d";

export const ENROLLMENT_RECORDS: EnrollmentRecord[] = [
  { date: "2026-06-03", classId: "grade7-lions", termId: "term-2-2026", leads: 42, qualified: 30, applied: 24, enrolled: 20 },
  { date: "2026-06-17", classId: "grade8-eagles", termId: "term-2-2026", leads: 38, qualified: 28, applied: 21, enrolled: 17 },
  { date: "2026-07-01", classId: "grade7-lions", termId: "term-2-2026", leads: 40, qualified: 29, applied: 23, enrolled: 18 },
  { date: "2026-07-14", classId: "grade8-eagles", termId: "term-2-2026", leads: 36, qualified: 25, applied: 20, enrolled: 16 },
  { date: "2026-07-22", classId: "grade7-lions", termId: "term-2-2026", leads: 34, qualified: 24, applied: 18, enrolled: 14 },
  { date: "2026-07-27", classId: "grade8-eagles", termId: "term-2-2026", leads: 32, qualified: 23, applied: 17, enrolled: 13 }
];

export const ATTENDANCE_RISK_RECORDS: AttendanceRiskRecord[] = [
  { date: "2026-06-03", classId: "grade7-lions", termId: "term-2-2026", atRiskLearners: 13, atRiskRate: 12.5 },
  { date: "2026-06-17", classId: "grade8-eagles", termId: "term-2-2026", atRiskLearners: 11, atRiskRate: 10.9 },
  { date: "2026-07-01", classId: "grade7-lions", termId: "term-2-2026", atRiskLearners: 10, atRiskRate: 9.8 },
  { date: "2026-07-14", classId: "grade8-eagles", termId: "term-2-2026", atRiskLearners: 9, atRiskRate: 9.2 },
  { date: "2026-07-22", classId: "grade7-lions", termId: "term-2-2026", atRiskLearners: 8, atRiskRate: 8.7 },
  { date: "2026-07-27", classId: "grade8-eagles", termId: "term-2-2026", atRiskLearners: 7, atRiskRate: 8.1 }
];

export const FINANCE_HEALTH_RECORDS: FinanceHealthRecord[] = [
  { date: "2026-06-03", classId: "grade7-lions", termId: "term-2-2026", paidCount: 98, overdueCount: 24, paidAmount: 8820000, overdueAmount: 1260000 },
  { date: "2026-06-17", classId: "grade8-eagles", termId: "term-2-2026", paidCount: 92, overdueCount: 21, paidAmount: 8400000, overdueAmount: 1110000 },
  { date: "2026-07-01", classId: "grade7-lions", termId: "term-2-2026", paidCount: 104, overdueCount: 19, paidAmount: 9210000, overdueAmount: 1010000 },
  { date: "2026-07-14", classId: "grade8-eagles", termId: "term-2-2026", paidCount: 108, overdueCount: 18, paidAmount: 9600000, overdueAmount: 990000 },
  { date: "2026-07-22", classId: "grade7-lions", termId: "term-2-2026", paidCount: 112, overdueCount: 15, paidAmount: 10010000, overdueAmount: 820000 },
  { date: "2026-07-27", classId: "grade8-eagles", termId: "term-2-2026", paidCount: 114, overdueCount: 13, paidAmount: 10260000, overdueAmount: 740000 }
];

export const ACADEMIC_TREND_RECORDS: AcademicTrendRecord[] = [
  { date: "2026-06-03", classId: "grade7-lions", termId: "term-2-2026", averageScore: 66.2, passRate: 84.3 },
  { date: "2026-06-17", classId: "grade8-eagles", termId: "term-2-2026", averageScore: 67.8, passRate: 85.9 },
  { date: "2026-07-01", classId: "grade7-lions", termId: "term-2-2026", averageScore: 68.1, passRate: 86.1 },
  { date: "2026-07-14", classId: "grade8-eagles", termId: "term-2-2026", averageScore: 69.5, passRate: 87.4 },
  { date: "2026-07-22", classId: "grade7-lions", termId: "term-2-2026", averageScore: 70.4, passRate: 88.2 },
  { date: "2026-07-27", classId: "grade8-eagles", termId: "term-2-2026", averageScore: 71.1, passRate: 89.1 }
];

export const COMMUNICATIONS_RECORDS: CommunicationsRecord[] = [
  { date: "2026-06-03", classId: "grade7-lions", termId: "term-2-2026", delivered: 640, opened: 502, acknowledged: 279, failed: 28 },
  { date: "2026-06-17", classId: "grade8-eagles", termId: "term-2-2026", delivered: 622, opened: 488, acknowledged: 272, failed: 24 },
  { date: "2026-07-01", classId: "grade7-lions", termId: "term-2-2026", delivered: 658, opened: 522, acknowledged: 296, failed: 21 },
  { date: "2026-07-14", classId: "grade8-eagles", termId: "term-2-2026", delivered: 676, opened: 548, acknowledged: 307, failed: 19 },
  { date: "2026-07-22", classId: "grade7-lions", termId: "term-2-2026", delivered: 690, opened: 564, acknowledged: 321, failed: 17 },
  { date: "2026-07-27", classId: "grade8-eagles", termId: "term-2-2026", delivered: 704, opened: 583, acknowledged: 336, failed: 15 }
];

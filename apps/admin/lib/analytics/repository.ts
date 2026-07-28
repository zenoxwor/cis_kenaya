import {
  ACADEMIC_TREND_RECORDS,
  ATTENDANCE_RISK_RECORDS,
  COMMUNICATIONS_RECORDS,
  DATE_RANGE_OPTIONS,
  DEFAULT_DATE_RANGE,
  ENROLLMENT_RECORDS,
  FINANCE_HEALTH_RECORDS,
  type AcademicTrendRecord,
  type AttendanceRiskRecord,
  type CommunicationsRecord,
  type EnrollmentRecord,
  type FinanceHealthRecord
} from "@/lib/analytics/mock-data";
import type { ExecutiveAnalyticsCard, ExecutiveAnalyticsSnapshot, ExecutiveFilters } from "@/lib/analytics/types";
import { EXAM_CLASSES, EXAM_TERMS } from "@/lib/exams/mock-data";
import { canAccessRoute } from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/roles";

type AnalyticsParams = {
  role: AppRole;
  requestedFilters: Partial<Record<keyof ExecutiveFilters, string | undefined>>;
};

function toNumberLabel(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function toCurrencyLabel(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(
    value
  );
}

function toPercentLabel(value: number) {
  return `${value.toFixed(1)}%`;
}

function getRangeDays(range: string) {
  switch (range) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    case "30d":
    default:
      return 30;
  }
}

function sanitizeFilters(requestedFilters: AnalyticsParams["requestedFilters"]): ExecutiveFilters {
  const dateRange = DATE_RANGE_OPTIONS.some(option => option.value === requestedFilters.dateRange)
    ? (requestedFilters.dateRange as ExecutiveFilters["dateRange"])
    : DEFAULT_DATE_RANGE;
  const classId = requestedFilters.classId && requestedFilters.classId.length > 0 ? requestedFilters.classId : "all";
  const termId = requestedFilters.termId && requestedFilters.termId.length > 0 ? requestedFilters.termId : "all";

  return { dateRange, classId, termId };
}

function inRange(date: string, range: ExecutiveFilters["dateRange"]) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - getRangeDays(range));
  const sample = new Date(date);
  return sample >= start && sample <= end;
}

function matchesRecord(record: { date: string; classId: string; termId: string }, filters: ExecutiveFilters) {
  if (!inRange(record.date, filters.dateRange)) {
    return false;
  }
  if (filters.classId !== "all" && filters.classId !== record.classId) {
    return false;
  }
  if (filters.termId !== "all" && filters.termId !== record.termId) {
    return false;
  }
  return true;
}

function sum<T>(records: T[], selector: (record: T) => number) {
  return records.reduce((total, record) => total + selector(record), 0);
}

function average<T>(records: T[], selector: (record: T) => number) {
  if (records.length === 0) {
    return 0;
  }
  return sum(records, selector) / records.length;
}

function buildEnrollmentCard(records: EnrollmentRecord[]): ExecutiveAnalyticsCard {
  const leads = sum(records, record => record.leads);
  const qualified = sum(records, record => record.qualified);
  const applied = sum(records, record => record.applied);
  const enrolled = sum(records, record => record.enrolled);
  const conversionRate = leads > 0 ? (enrolled / leads) * 100 : 0;

  return {
    id: "enrollment",
    title: "Enrollment pipeline funnel",
    description: "Track movement from lead capture through confirmed enrollment.",
    metrics: [
      {
        label: "Qualified leads",
        value: toNumberLabel(qualified),
        detail: `${toNumberLabel(leads)} leads captured`,
        tone: "neutral",
        href: "/admin/reception/applications"
      },
      {
        label: "Pipeline conversion",
        value: toPercentLabel(conversionRate),
        detail: `${toNumberLabel(enrolled)} enrolled`,
        tone: conversionRate >= 50 ? "positive" : "warning",
        href: "/admin/reception/analytics"
      }
    ],
    chart: {
      type: "funnel",
      unit: "students",
      stages: [
        { label: "Leads", value: leads },
        { label: "Qualified", value: qualified },
        { label: "Applied", value: applied },
        { label: "Enrolled", value: enrolled }
      ]
    },
    drilldowns: [
      { label: "Applications queue", href: "/admin/reception/applications" },
      { label: "Reception analytics", href: "/admin/reception/analytics" }
    ]
  };
}

function buildAttendanceCard(records: AttendanceRiskRecord[]): ExecutiveAnalyticsCard {
  const latest = records.at(-1);
  const baseline = records[0];
  const trendShift =
    latest && baseline
      ? baseline.atRiskRate - latest.atRiskRate
      : 0;

  return {
    id: "attendance",
    title: "Attendance risk trends",
    description: "Monitor at-risk learners and recent attendance-risk trajectory.",
    metrics: [
      {
        label: "At-risk learners",
        value: toNumberLabel(latest?.atRiskLearners ?? 0),
        detail: latest ? `${toPercentLabel(latest.atRiskRate)} current risk rate` : "No records in selected range",
        tone: (latest?.atRiskRate ?? 0) <= 9 ? "positive" : "warning",
        href: "/admin/attendance/reports"
      },
      {
        label: "Risk movement",
        value: `${trendShift >= 0 ? "↓" : "↑"} ${toPercentLabel(Math.abs(trendShift))}`,
        detail: "Compared with start of selected period",
        tone: trendShift >= 0 ? "positive" : "warning",
        href: "/admin/attendance"
      }
    ],
    chart: {
      type: "trend",
      unit: "% at-risk",
      points:
        records.length > 0
          ? records.map(record => ({
              label: record.date.slice(5),
              value: record.atRiskRate
            }))
          : [{ label: "No data", value: 0 }]
    },
    drilldowns: [
      { label: "Attendance reports", href: "/admin/attendance/reports" },
      { label: "Attendance capture", href: "/admin/attendance" }
    ]
  };
}

function buildFinanceCard(records: FinanceHealthRecord[]): ExecutiveAnalyticsCard {
  const paidCount = sum(records, record => record.paidCount);
  const overdueCount = sum(records, record => record.overdueCount);
  const paidAmount = sum(records, record => record.paidAmount);
  const overdueAmount = sum(records, record => record.overdueAmount);
  const healthRate = paidCount + overdueCount > 0 ? (paidCount / (paidCount + overdueCount)) * 100 : 0;

  return {
    id: "finance",
    title: "Fee collection health",
    description: "Balance paid and overdue fee positions for collection action.",
    metrics: [
      {
        label: "Collection health",
        value: toPercentLabel(healthRate),
        detail: `${toNumberLabel(overdueCount)} overdue accounts`,
        tone: healthRate >= 80 ? "positive" : "warning",
        href: "/admin/finance/reports"
      },
      {
        label: "Overdue exposure",
        value: toCurrencyLabel(overdueAmount),
        detail: `${toCurrencyLabel(paidAmount)} collected`,
        tone: overdueAmount <= paidAmount * 0.15 ? "positive" : "warning",
        href: "/admin/finance/invoices"
      }
    ],
    chart: {
      type: "split",
      unit: "accounts",
      segments: [
        { label: "Paid", value: paidCount, tone: "positive" },
        { label: "Overdue", value: overdueCount, tone: "warning" }
      ]
    },
    drilldowns: [
      { label: "Finance reports", href: "/admin/finance/reports" },
      { label: "Overdue invoices", href: "/admin/finance/invoices" },
      { label: "Payment operations", href: "/admin/finance/payments" }
    ]
  };
}

function buildAcademicCard(records: AcademicTrendRecord[]): ExecutiveAnalyticsCard {
  const averageScore = average(records, record => record.averageScore);
  const passRate = average(records, record => record.passRate);

  return {
    id: "academics",
    title: "Academic performance trends",
    description: "Summarize score and pass-rate movement for executive review.",
    metrics: [
      {
        label: "Average score",
        value: toPercentLabel(averageScore),
        detail: "Across selected classes and term window",
        tone: averageScore >= 70 ? "positive" : "neutral",
        href: "/admin/exams/reports"
      },
      {
        label: "Pass rate",
        value: toPercentLabel(passRate),
        detail: "Recent exam cycles",
        tone: passRate >= 85 ? "positive" : "warning",
        href: "/admin/exams/marks"
      }
    ],
    chart: {
      type: "trend",
      unit: "% score",
      points:
        records.length > 0
          ? records.map(record => ({
              label: record.date.slice(5),
              value: record.averageScore
            }))
          : [{ label: "No data", value: 0 }]
    },
    drilldowns: [
      { label: "Exam reports", href: "/admin/exams/reports" },
      { label: "Marks entry", href: "/admin/exams/marks" }
    ]
  };
}

function buildCommunicationsCard(records: CommunicationsRecord[]): ExecutiveAnalyticsCard {
  const delivered = sum(records, record => record.delivered);
  const opened = sum(records, record => record.opened);
  const acknowledged = sum(records, record => record.acknowledged);
  const failed = sum(records, record => record.failed);
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
  const acknowledgementRate = delivered > 0 ? (acknowledged / delivered) * 100 : 0;

  return {
    id: "communications",
    title: "Communication engagement",
    description: "Track delivery reliability and parent/guardian engagement outcomes.",
    metrics: [
      {
        label: "Delivery success",
        value: toPercentLabel(delivered > 0 ? ((delivered - failed) / delivered) * 100 : 0),
        detail: `${toNumberLabel(failed)} failed deliveries`,
        tone: failed <= delivered * 0.05 ? "positive" : "warning",
        href: "/admin/communications/history"
      },
      {
        label: "Engagement rate",
        value: toPercentLabel(acknowledgementRate),
        detail: `${toPercentLabel(openRate)} open rate`,
        tone: acknowledgementRate >= 45 ? "positive" : "neutral",
        href: "/admin/communications/compose"
      }
    ],
    chart: {
      type: "split",
      unit: "messages",
      segments: [
        { label: "Delivered", value: delivered, tone: "positive" },
        { label: "Opened", value: opened, tone: "neutral" },
        { label: "Acknowledged", value: acknowledged, tone: "positive" }
      ]
    },
    drilldowns: [
      { label: "Delivery history", href: "/admin/communications/history" },
      { label: "Compose campaign", href: "/admin/communications/compose" },
      { label: "Template management", href: "/admin/communications/templates" }
    ]
  };
}

function hasRoute(role: AppRole, href: string) {
  return canAccessRoute(role, href);
}

export function getExecutiveAnalyticsSnapshot({ role, requestedFilters }: AnalyticsParams): ExecutiveAnalyticsSnapshot {
  const filters = sanitizeFilters(requestedFilters);
  const classes = [{ value: "all", label: "All classes" }, ...EXAM_CLASSES.map(item => ({ value: item.id, label: item.name }))];
  const terms = [{ value: "all", label: "All terms" }, ...EXAM_TERMS.map(item => ({ value: item.id, label: `${item.name} ${item.year}` }))];

  const enrollmentRecords = ENROLLMENT_RECORDS.filter(record => matchesRecord(record, filters));
  const attendanceRecords = ATTENDANCE_RISK_RECORDS.filter(record => matchesRecord(record, filters));
  const financeRecords = FINANCE_HEALTH_RECORDS.filter(record => matchesRecord(record, filters));
  const academicRecords = ACADEMIC_TREND_RECORDS.filter(record => matchesRecord(record, filters));
  const communicationsRecords = COMMUNICATIONS_RECORDS.filter(record => matchesRecord(record, filters));

  const cards = [
    buildEnrollmentCard(enrollmentRecords),
    buildAttendanceCard(attendanceRecords),
    buildFinanceCard(financeRecords),
    buildAcademicCard(academicRecords),
    buildCommunicationsCard(communicationsRecords)
  ]
    .map(card => {
      const visibleDrilldowns = card.drilldowns.filter(link => hasRoute(role, link.href));
      const visibleMetrics = card.metrics.filter(metric => hasRoute(role, metric.href));
      return { ...card, drilldowns: visibleDrilldowns, metrics: visibleMetrics };
    })
    .filter(card => card.metrics.length > 0 && card.drilldowns.length > 0);

  return {
    role,
    filters,
    filterConfig: {
      dateRanges: DATE_RANGE_OPTIONS,
      classes,
      terms,
      showClassFilter: hasRoute(role, "/admin/attendance/reports") || hasRoute(role, "/admin/exams/reports"),
      showTermFilter: hasRoute(role, "/admin/exams/reports") || hasRoute(role, "/admin/finance/reports")
    },
    cards
  };
}

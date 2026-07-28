import type { AppRole } from "@/lib/rbac/roles";
import { sendAutomationCampaign } from "@/lib/communications/repository";
import { appendAuditLog } from "@/lib/audit/repository";

export type FinanceTriggerType =
  | "UNPAID_RISK_REMINDER"
  | "EXAM_HOLD_NOTICE"
  | "OVERDUE_INVOICE_REMINDER";

export type FinanceAutomationRules = {
  unpaidRiskReminderEnabled: boolean;
  attendanceRiskAbsenceThreshold: number;
  repeatedAbsenceThreshold: number;
  examHoldEnabled: boolean;
  examArrearsPercentThreshold: number;
  examArrearsMinimumMinor: number;
  overdueInvoiceReminderEnabled: boolean;
  overdueInvoiceDaysThreshold: number;
};

export type FinanceAutomationOutcome = {
  id: string;
  timestamp: string;
  triggerType: FinanceTriggerType;
  studentId: string;
  studentCode: string;
  studentName: string;
  module: "ATTENDANCE" | "EXAMS" | "COMMUNICATIONS";
  severity: "INFO" | "WARNING" | "CRITICAL";
  kind: "EVALUATION" | "ACTION";
  message: string;
  dispatchedCampaignId: string | null;
};

export type FinanceSignalStudent = {
  studentId: string;
  studentCode: string;
  admissionNo: string;
  studentName: string;
  className: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  attendanceAbsencesIn7Days: number;
  consecutiveAbsences: number;
  invoiceTotalMinor: number;
  arrearsMinor: number;
  overdueDays: number;
};

export type FinanceStatusBadge = {
  label: string;
  tone: "info" | "warning" | "critical";
};

const RULE_BOUNDS = {
  attendanceRiskAbsenceThreshold: { min: 1, max: 10 },
  repeatedAbsenceThreshold: { min: 1, max: 10 },
  examArrearsPercentThreshold: { min: 10, max: 95 },
  examArrearsMinimumMinor: { min: 1000, max: 2000000 },
  overdueInvoiceDaysThreshold: { min: 1, max: 180 }
} as const;

const DEFAULT_RULES: FinanceAutomationRules = {
  unpaidRiskReminderEnabled: true,
  attendanceRiskAbsenceThreshold: 3,
  repeatedAbsenceThreshold: 2,
  examHoldEnabled: true,
  examArrearsPercentThreshold: 35,
  examArrearsMinimumMinor: 15000,
  overdueInvoiceReminderEnabled: true,
  overdueInvoiceDaysThreshold: 14
};

const SIGNAL_SNAPSHOTS: FinanceSignalStudent[] = [
  {
    studentId: "st-001",
    studentCode: "CIS/2024/071",
    admissionNo: "CIS/2024/071",
    studentName: "Amina Hassan",
    className: "Grade 7 - Lions",
    guardianName: "Fatuma Hassan",
    guardianPhone: "+254 722 987 654",
    guardianEmail: "f.hassan@gmail.com",
    attendanceAbsencesIn7Days: 4,
    consecutiveAbsences: 2,
    invoiceTotalMinor: 198000,
    arrearsMinor: 76000,
    overdueDays: 21
  },
  {
    studentId: "st-002",
    studentCode: "CIS/2024/072",
    admissionNo: "CIS/2024/072",
    studentName: "Brian Odhiambo",
    className: "Grade 7 - Lions",
    guardianName: "John Kamau",
    guardianPhone: "+254 725 998 001",
    guardianEmail: "j.kamau@gmail.com",
    attendanceAbsencesIn7Days: 1,
    consecutiveAbsences: 0,
    invoiceTotalMinor: 198000,
    arrearsMinor: 18000,
    overdueDays: 8
  },
  {
    studentId: "st-004",
    studentCode: "CIS/2024/074",
    admissionNo: "CIS/2024/074",
    studentName: "Daniel Mwangi",
    className: "Grade 7 - Lions",
    guardianName: "David Mwangi",
    guardianPhone: "+254 712 345 678",
    guardianEmail: "d.mwangi@gmail.com",
    attendanceAbsencesIn7Days: 3,
    consecutiveAbsences: 3,
    invoiceTotalMinor: 198000,
    arrearsMinor: 98000,
    overdueDays: 33
  },
  {
    studentId: "st-006",
    studentCode: "CIS/2024/082",
    admissionNo: "CIS/2024/082",
    studentName: "Faisal Noor",
    className: "Grade 8 - Eagles",
    guardianName: "Mary Njoroge",
    guardianPhone: "+254 733 444 555",
    guardianEmail: "mary.njoroge@yahoo.com",
    attendanceAbsencesIn7Days: 2,
    consecutiveAbsences: 1,
    invoiceTotalMinor: 215000,
    arrearsMinor: 92000,
    overdueDays: 27
  }
];

let rules: FinanceAutomationRules = { ...DEFAULT_RULES };
let outcomes: FinanceAutomationOutcome[] = [];
let lastEvaluatedAt: string | null = null;
let lastEvaluationMillis = 0;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nextOutcomeId() {
  return `fin-auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushOutcome(
  outcome: Omit<FinanceAutomationOutcome, "id" | "timestamp">
) {
  const record: FinanceAutomationOutcome = {
    id: nextOutcomeId(),
    timestamp: new Date().toISOString(),
    ...outcome
  };
  outcomes.unshift(record);
  return record;
}

function auditOutcome(actor: { id: string; role: AppRole }, outcome: FinanceAutomationOutcome) {
  appendAuditLog({
    actorUserId: actor.id,
    actorRole: actor.role,
    action:
      outcome.kind === "ACTION"
        ? "finance_automation_action"
        : "finance_automation_evaluation",
    resourceType: "FinanceAutomation",
    resourceId: `${outcome.triggerType}:${outcome.studentCode}`,
    metadata: {
      triggerType: outcome.triggerType,
      kind: outcome.kind,
      module: outcome.module,
      severity: outcome.severity,
      message: outcome.message,
      dispatchedCampaignId: outcome.dispatchedCampaignId
    }
  });
}

function toArrearsPercent(student: FinanceSignalStudent) {
  if (student.invoiceTotalMinor <= 0) {
    return 0;
  }
  return (student.arrearsMinor / student.invoiceTotalMinor) * 100;
}

export function getFinanceAutomationRules() {
  return { ...rules };
}

export function updateFinanceAutomationRules(
  partial: Partial<FinanceAutomationRules>
) {
  const next: FinanceAutomationRules = {
    ...rules,
    ...partial
  };

  next.attendanceRiskAbsenceThreshold = clamp(
    next.attendanceRiskAbsenceThreshold,
    RULE_BOUNDS.attendanceRiskAbsenceThreshold.min,
    RULE_BOUNDS.attendanceRiskAbsenceThreshold.max
  );
  next.repeatedAbsenceThreshold = clamp(
    next.repeatedAbsenceThreshold,
    RULE_BOUNDS.repeatedAbsenceThreshold.min,
    RULE_BOUNDS.repeatedAbsenceThreshold.max
  );
  next.examArrearsPercentThreshold = clamp(
    next.examArrearsPercentThreshold,
    RULE_BOUNDS.examArrearsPercentThreshold.min,
    RULE_BOUNDS.examArrearsPercentThreshold.max
  );
  next.examArrearsMinimumMinor = clamp(
    next.examArrearsMinimumMinor,
    RULE_BOUNDS.examArrearsMinimumMinor.min,
    RULE_BOUNDS.examArrearsMinimumMinor.max
  );
  next.overdueInvoiceDaysThreshold = clamp(
    next.overdueInvoiceDaysThreshold,
    RULE_BOUNDS.overdueInvoiceDaysThreshold.min,
    RULE_BOUNDS.overdueInvoiceDaysThreshold.max
  );

  rules = next;
  return getFinanceAutomationRules();
}

export function listFinanceAutomationOutcomes(limit = 80) {
  return outcomes.slice(0, limit);
}

export function getFinanceSignalSnapshots() {
  return [...SIGNAL_SNAPSHOTS];
}

export function evaluateFinanceAutomation(
  actor: { id: string; role: AppRole },
  options?: { force?: boolean }
) {
  const now = Date.now();
  if (!options?.force && now - lastEvaluationMillis < 60_000) {
    return {
      rules: getFinanceAutomationRules(),
      outcomes: listFinanceAutomationOutcomes(60),
      lastEvaluatedAt
    };
  }

  const created: FinanceAutomationOutcome[] = [];

  for (const student of SIGNAL_SNAPSHOTS) {
    const attendanceRisk =
      student.attendanceAbsencesIn7Days >= rules.attendanceRiskAbsenceThreshold ||
      student.consecutiveAbsences >= rules.repeatedAbsenceThreshold;

    const unpaidRiskTriggered =
      rules.unpaidRiskReminderEnabled && attendanceRisk && student.arrearsMinor > 0;

    const unpaidEval = pushOutcome({
      triggerType: "UNPAID_RISK_REMINDER",
      studentId: student.studentId,
      studentCode: student.studentCode,
      studentName: student.studentName,
      module: "ATTENDANCE",
      severity: unpaidRiskTriggered ? "WARNING" : "INFO",
      kind: "EVALUATION",
      message: unpaidRiskTriggered
        ? "Attendance risk and arrears detected."
        : "Attendance-risk unpaid reminder conditions not met.",
      dispatchedCampaignId: null
    });
    created.push(unpaidEval);
    auditOutcome(actor, unpaidEval);

    if (unpaidRiskTriggered) {
      const campaign = sendAutomationCampaign({
        dedupeKey: `unpaid-risk:${student.studentId}`,
        triggerType: "UNPAID_RISK_REMINDER",
        studentName: student.studentName,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        message: `Reminder: ${student.studentName} has attendance risk with outstanding fees.`
      });

      const action = pushOutcome({
        triggerType: "UNPAID_RISK_REMINDER",
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.studentName,
        module: "ATTENDANCE",
        severity: "WARNING",
        kind: "ACTION",
        message: campaign
          ? "Parent reminder queued as in-app mock dispatch."
          : "Reminder previously queued; no duplicate dispatch.",
        dispatchedCampaignId: campaign?.id ?? null
      });
      created.push(action);
      auditOutcome(actor, action);
    }

    const arrearsPercent = toArrearsPercent(student);
    const examHoldTriggered =
      rules.examHoldEnabled &&
      student.arrearsMinor >= rules.examArrearsMinimumMinor &&
      arrearsPercent >= rules.examArrearsPercentThreshold;

    const examEval = pushOutcome({
      triggerType: "EXAM_HOLD_NOTICE",
      studentId: student.studentId,
      studentCode: student.studentCode,
      studentName: student.studentName,
      module: "EXAMS",
      severity: examHoldTriggered ? "CRITICAL" : "INFO",
      kind: "EVALUATION",
      message: examHoldTriggered
        ? "Arrears threshold crossed; exam hold signal raised."
        : "Exam-hold arrears conditions not met.",
      dispatchedCampaignId: null
    });
    created.push(examEval);
    auditOutcome(actor, examEval);

    if (examHoldTriggered) {
      const campaign = sendAutomationCampaign({
        dedupeKey: `exam-hold:${student.studentId}`,
        triggerType: "EXAM_HOLD_NOTICE",
        studentName: student.studentName,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        message: `Notice: ${student.studentName} has crossed the arrears threshold for exam clearance.`
      });

      const action = pushOutcome({
        triggerType: "EXAM_HOLD_NOTICE",
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.studentName,
        module: "EXAMS",
        severity: "CRITICAL",
        kind: "ACTION",
        message: campaign
          ? "Exam hold notice queued as in-app mock dispatch."
          : "Exam hold notice already queued earlier.",
        dispatchedCampaignId: campaign?.id ?? null
      });
      created.push(action);
      auditOutcome(actor, action);
    }

    const overdueTriggered =
      rules.overdueInvoiceReminderEnabled &&
      student.overdueDays >= rules.overdueInvoiceDaysThreshold &&
      student.arrearsMinor > 0;

    const overdueEval = pushOutcome({
      triggerType: "OVERDUE_INVOICE_REMINDER",
      studentId: student.studentId,
      studentCode: student.studentCode,
      studentName: student.studentName,
      module: "COMMUNICATIONS",
      severity: overdueTriggered ? "WARNING" : "INFO",
      kind: "EVALUATION",
      message: overdueTriggered
        ? "Invoice overdue threshold crossed for guardian communication."
        : "Overdue invoice reminder conditions not met.",
      dispatchedCampaignId: null
    });
    created.push(overdueEval);
    auditOutcome(actor, overdueEval);

    if (overdueTriggered) {
      const campaign = sendAutomationCampaign({
        dedupeKey: `overdue-reminder:${student.studentId}`,
        triggerType: "OVERDUE_INVOICE_REMINDER",
        studentName: student.studentName,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        message: `Reminder: invoice for ${student.studentName} is overdue by ${student.overdueDays} days.`
      });

      const action = pushOutcome({
        triggerType: "OVERDUE_INVOICE_REMINDER",
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.studentName,
        module: "COMMUNICATIONS",
        severity: "WARNING",
        kind: "ACTION",
        message: campaign
          ? "Overdue invoice parent reminder queued in-app."
          : "Overdue reminder already queued earlier.",
        dispatchedCampaignId: campaign?.id ?? null
      });
      created.push(action);
      auditOutcome(actor, action);
    }
  }

  lastEvaluatedAt = new Date().toISOString();
  lastEvaluationMillis = now;

  return {
    rules: getFinanceAutomationRules(),
    outcomes: listFinanceAutomationOutcomes(60),
    created,
    lastEvaluatedAt
  };
}

function computeBadge(signal: FinanceSignalStudent): FinanceStatusBadge[] {
  const result: FinanceStatusBadge[] = [];
  const arrearsPercent = toArrearsPercent(signal);
  const attendanceRisk =
    signal.attendanceAbsencesIn7Days >= rules.attendanceRiskAbsenceThreshold ||
    signal.consecutiveAbsences >= rules.repeatedAbsenceThreshold;

  if (attendanceRisk && signal.arrearsMinor > 0) {
    result.push({ label: "Unpaid Risk", tone: "warning" });
  }
  if (
    signal.arrearsMinor >= rules.examArrearsMinimumMinor &&
    arrearsPercent >= rules.examArrearsPercentThreshold
  ) {
    result.push({ label: "Exam Hold", tone: "critical" });
  }
  if (signal.overdueDays >= rules.overdueInvoiceDaysThreshold && signal.arrearsMinor > 0) {
    result.push({ label: "Parent Reminder", tone: "info" });
  }

  return result;
}

export function getFinanceBadgesByStudentCode() {
  const lookup: Record<string, FinanceStatusBadge[]> = {};
  for (const signal of SIGNAL_SNAPSHOTS) {
    lookup[signal.studentCode] = computeBadge(signal);
  }
  return lookup;
}

export function getFinanceBadgesByAdmissionNo() {
  const lookup: Record<string, FinanceStatusBadge[]> = {};
  for (const signal of SIGNAL_SNAPSHOTS) {
    lookup[signal.admissionNo] = computeBadge(signal);
  }
  return lookup;
}

export function getFinanceAutomationSummary() {
  const recent = listFinanceAutomationOutcomes(50);
  const actionCount = recent.filter(entry => entry.kind === "ACTION").length;
  const criticalCount = recent.filter(entry => entry.severity === "CRITICAL").length;
  return {
    lastEvaluatedAt,
    totalSignals: SIGNAL_SNAPSHOTS.length,
    actionCount,
    criticalCount
  };
}

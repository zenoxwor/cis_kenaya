import type { TriggerConfig } from "./types";
import { logAuditEvent } from "@/lib/observability/audit-stream";

// ─── Default Trigger Config ───────────────────────────────────────────────────

let triggerConfig: TriggerConfig = {
  feeOverdueEnabled: true,
  feeOverdueDaysThreshold: 14,
  attendanceAlertEnabled: true,
  attendanceStreakThreshold: 3
};

export function getTriggerConfig(): TriggerConfig {
  return { ...triggerConfig };
}

export function updateTriggerConfig(partial: Partial<TriggerConfig>): TriggerConfig {
  triggerConfig = { ...triggerConfig, ...partial };
  return { ...triggerConfig };
}

/**
 * Mock fee-overdue trigger check.
 * In production this would query FeeInvoice where dueDate < now - threshold days
 * and send via the real provider.  Here we just log the intent.
 */
export function runFeeOverdueTrigger(): { triggered: boolean; count: number } {
  const cfg = getTriggerConfig();
  if (!cfg.feeOverdueEnabled) {
    logAuditEvent({
      actor: { id: "system", role: "SYSTEM", name: "Automation", ipAddress: null },
      action: "trigger.fee_overdue_run",
      entity: "Trigger",
      entityId: "fee_overdue",
      module: "communications",
      status: "warning",
      metadata: { reason: "disabled" }
    });
    return { triggered: false, count: 0 };
  }

  // Mock: pretend 4 guardians qualify
  const count = 4;
  console.log(
    `[CIS Kenya] Fee overdue trigger: would notify ${count} guardians (threshold: ${cfg.feeOverdueDaysThreshold} days)`
  );
  logAuditEvent({
    actor: { id: "system", role: "SYSTEM", name: "Automation", ipAddress: null },
    action: "trigger.fee_overdue_run",
    entity: "Trigger",
    entityId: "fee_overdue",
    module: "communications",
    status: "success",
    metadata: { count, thresholdDays: cfg.feeOverdueDaysThreshold }
  });
  return { triggered: true, count };
}

/**
 * Mock attendance trigger check.
 * In production this would query attendance records for streak >= threshold.
 */
export function runAttendanceTrigger(): { triggered: boolean; count: number } {
  const cfg = getTriggerConfig();
  if (!cfg.attendanceAlertEnabled) {
    logAuditEvent({
      actor: { id: "system", role: "SYSTEM", name: "Automation", ipAddress: null },
      action: "trigger.attendance_run",
      entity: "Trigger",
      entityId: "attendance_alert",
      module: "communications",
      status: "warning",
      metadata: { reason: "disabled" }
    });
    return { triggered: false, count: 0 };
  }

  const count = 2;
  console.log(
    `[CIS Kenya] Attendance trigger: would notify ${count} guardians (streak: ${cfg.attendanceStreakThreshold} days)`
  );
  logAuditEvent({
    actor: { id: "system", role: "SYSTEM", name: "Automation", ipAddress: null },
    action: "trigger.attendance_run",
    entity: "Trigger",
    entityId: "attendance_alert",
    module: "communications",
    status: "success",
    metadata: { count, thresholdDays: cfg.attendanceStreakThreshold }
  });
  return { triggered: true, count };
}

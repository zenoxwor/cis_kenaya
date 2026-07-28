import type { TriggerConfig } from "./types";

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
  if (!cfg.feeOverdueEnabled) return { triggered: false, count: 0 };

  // Mock: pretend 4 guardians qualify
  const count = 4;
  console.log(
    `[CIS Kenya] Fee overdue trigger: would notify ${count} guardians (threshold: ${cfg.feeOverdueDaysThreshold} days)`
  );
  return { triggered: true, count };
}

/**
 * Mock attendance trigger check.
 * In production this would query attendance records for streak >= threshold.
 */
export function runAttendanceTrigger(): { triggered: boolean; count: number } {
  const cfg = getTriggerConfig();
  if (!cfg.attendanceAlertEnabled) return { triggered: false, count: 0 };

  const count = 2;
  console.log(
    `[CIS Kenya] Attendance trigger: would notify ${count} guardians (streak: ${cfg.attendanceStreakThreshold} days)`
  );
  return { triggered: true, count };
}

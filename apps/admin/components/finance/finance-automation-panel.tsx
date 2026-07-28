"use client";

import { useState, useTransition } from "react";
import type {
  FinanceAutomationOutcome,
  FinanceAutomationRules
} from "@/lib/finance/automation";

type FinanceAutomationPanelProps = {
  initialRules: FinanceAutomationRules;
  initialOutcomes: FinanceAutomationOutcome[];
  initialLastEvaluatedAt: string | null;
  canManage: boolean;
};

type SeverityTone = "INFO" | "WARNING" | "CRITICAL";

const toneClass: Record<SeverityTone, string> = {
  INFO: "bg-sky-100 text-sky-700",
  WARNING: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-red-100 text-red-700"
};

function formatCurrency(minor: number) {
  return `KES ${(minor / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function FinanceAutomationPanel({
  initialRules,
  initialOutcomes,
  initialLastEvaluatedAt,
  canManage
}: FinanceAutomationPanelProps) {
  const [rules, setRules] = useState(initialRules);
  const [outcomes, setOutcomes] = useState(initialOutcomes);
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState<string | null>(initialLastEvaluatedAt);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveRules() {
    startTransition(async () => {
      const response = await fetch("/api/finance/automation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules)
      });

      if (!response.ok) {
        setNotice("Could not save automation rules.");
        return;
      }

      const payload = await response.json();
      setRules(payload.rules);
      setOutcomes(payload.outcomes ?? []);
      setLastEvaluatedAt(payload.summary?.lastEvaluatedAt ?? null);
      setNotice("Finance automation rules updated.");
    });
  }

  function runEvaluation() {
    startTransition(async () => {
      const response = await fetch("/api/finance/automation", { method: "POST" });
      if (!response.ok) {
        setNotice("Could not run automation evaluation.");
        return;
      }
      const payload = await response.json();
      setOutcomes(payload.outcomes ?? []);
      setLastEvaluatedAt(payload.summary?.lastEvaluatedAt ?? null);
      setNotice("Finance automation re-evaluated.");
    });
  }

  return (
    <section className="space-y-4">
      <article className="admin-content-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Finance Automation Panel</h2>
            <p className="mt-1 text-sm text-slate-600">
              Attendance, exams, and communication escalation rules for fee risk.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Last evaluated: {lastEvaluatedAt ? new Date(lastEvaluatedAt).toLocaleString("en-KE") : "Not yet"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              disabled={isPending}
              onClick={runEvaluation}
              type="button"
            >
              Re-evaluate
            </button>
            {canManage && (
              <button
                className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={isPending}
                onClick={saveRules}
                type="button"
              >
                Save rules
              </button>
            )}
          </div>
        </div>
      </article>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <article className="admin-content-card">
        <h3 className="text-base font-semibold text-slate-900">Rule thresholds</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <RuleToggle
            checked={rules.unpaidRiskReminderEnabled}
            description="Unpaid-risk reminder (attendance signal + arrears)"
            disabled={!canManage}
            label="Unpaid-risk trigger"
            onChange={checked => setRules(prev => ({ ...prev, unpaidRiskReminderEnabled: checked }))}
          />
          <RuleToggle
            checked={rules.examHoldEnabled}
            description="Exam hold notice when arrears thresholds are crossed"
            disabled={!canManage}
            label="Exam hold trigger"
            onChange={checked => setRules(prev => ({ ...prev, examHoldEnabled: checked }))}
          />
          <RuleToggle
            checked={rules.overdueInvoiceReminderEnabled}
            description="Parent overdue-invoice reminders in communications log"
            disabled={!canManage}
            label="Overdue reminder trigger"
            onChange={checked =>
              setRules(prev => ({ ...prev, overdueInvoiceReminderEnabled: checked }))
            }
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <RuleNumber
            disabled={!canManage}
            label="Attendance risk absences (7 days)"
            min={1}
            onChange={value => setRules(prev => ({ ...prev, attendanceRiskAbsenceThreshold: value }))}
            value={rules.attendanceRiskAbsenceThreshold}
          />
          <RuleNumber
            disabled={!canManage}
            label="Repeated absence streak"
            min={1}
            onChange={value => setRules(prev => ({ ...prev, repeatedAbsenceThreshold: value }))}
            value={rules.repeatedAbsenceThreshold}
          />
          <RuleNumber
            disabled={!canManage}
            label="Overdue invoice days"
            min={1}
            onChange={value => setRules(prev => ({ ...prev, overdueInvoiceDaysThreshold: value }))}
            value={rules.overdueInvoiceDaysThreshold}
          />
          <RuleNumber
            disabled={!canManage}
            label="Exam hold arrears %"
            min={10}
            onChange={value => setRules(prev => ({ ...prev, examArrearsPercentThreshold: value }))}
            value={rules.examArrearsPercentThreshold}
          />
          <RuleNumber
            disabled={!canManage}
            label="Exam hold arrears minimum"
            min={1000}
            onChange={value => setRules(prev => ({ ...prev, examArrearsMinimumMinor: value }))}
            value={rules.examArrearsMinimumMinor}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Arrears minimum preview</p>
            <p className="mt-1">{formatCurrency(rules.examArrearsMinimumMinor)}</p>
          </div>
        </div>
      </article>

      <article className="admin-content-card">
        <h3 className="text-base font-semibold text-slate-900">Recent evaluations and actions</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.slice(0, 20).map(outcome => (
                <tr key={outcome.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(outcome.timestamp).toLocaleString("en-KE")}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{outcome.studentName}</p>
                    <p className="text-xs text-slate-500">{outcome.studentCode}</p>
                  </td>
                  <td className="px-3 py-2">{outcome.module}</td>
                  <td className="px-3 py-2">{outcome.triggerType}</td>
                  <td className="px-3 py-2">{outcome.kind}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[outcome.severity]}`}>
                      {outcome.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{outcome.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function RuleToggle({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <input
          checked={checked}
          disabled={disabled}
          onChange={event => onChange(event.target.checked)}
          type="checkbox"
        />
      </div>
    </label>
  );
}

function RuleNumber({
  label,
  value,
  min,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-lg border border-slate-200 p-3 text-sm">
      <p className="font-medium text-slate-800">{label}</p>
      <input
        className="mt-2 w-full rounded border border-slate-200 px-2 py-1"
        disabled={disabled}
        min={min}
        onChange={event => onChange(Number(event.target.value) || min)}
        type="number"
        value={value}
      />
    </label>
  );
}

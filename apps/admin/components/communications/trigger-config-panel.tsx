"use client";

import { useState, useTransition } from "react";
import type { TriggerConfig } from "@/lib/communications/types";

type Props = {
  config: TriggerConfig;
  readOnly?: boolean;
};

export function TriggerConfigPanel({ config: initial, readOnly = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<TriggerConfig>(initial);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/communications/triggers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config)
        });
        if (res.ok) setSaved(true);
      } catch {
        // silent fail in mock
      }
    });
  }

  return (
    <div className="admin-content-card space-y-6">
      <div>
        <h2 className="font-semibold text-slate-900">Automated Trigger Notices</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure when CIS Kenya automatically sends notices to parents and guardians.
        </p>
      </div>

      {/* Fee overdue */}
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Fee Overdue Reminder</p>
            <p className="text-xs text-slate-500">Automatically notify guardians when fees are overdue</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={config.feeOverdueEnabled}
              disabled={readOnly}
              onChange={e =>
                setConfig(c => ({ ...c, feeOverdueEnabled: e.target.checked }))
              }
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-brand-500 peer-focus:ring-2 peer-focus:ring-brand-300 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>
        {config.feeOverdueEnabled && (
          <div className="flex items-center gap-3 pl-9">
            <label className="text-xs text-slate-500">Trigger after</label>
            <input
              type="number"
              min={1}
              max={90}
              value={config.feeOverdueDaysThreshold}
              disabled={readOnly}
              onChange={e =>
                setConfig(c => ({ ...c, feeOverdueDaysThreshold: parseInt(e.target.value, 10) || 14 }))
              }
              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-center focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
            />
            <label className="text-xs text-slate-500">days overdue</label>
          </div>
        )}
      </div>

      {/* Attendance alert */}
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Attendance Alert</p>
            <p className="text-xs text-slate-500">Notify guardians when a student misses consecutive days</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={config.attendanceAlertEnabled}
              disabled={readOnly}
              onChange={e =>
                setConfig(c => ({ ...c, attendanceAlertEnabled: e.target.checked }))
              }
            />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-brand-500 peer-focus:ring-2 peer-focus:ring-brand-300 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>
        {config.attendanceAlertEnabled && (
          <div className="flex items-center gap-3 pl-9">
            <label className="text-xs text-slate-500">Alert after</label>
            <input
              type="number"
              min={1}
              max={30}
              value={config.attendanceStreakThreshold}
              disabled={readOnly}
              onChange={e =>
                setConfig(c => ({ ...c, attendanceStreakThreshold: parseInt(e.target.value, 10) || 3 }))
              }
              className="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-center focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
            />
            <label className="text-xs text-slate-500">consecutive absences</label>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
          {saved && (
            <p className="text-sm text-emerald-600">Settings saved.</p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

type SettingsState = {
  enforceMfa: boolean;
  sessionTimeoutMinutes: number;
  autoIssueInvoiceOnApproval: boolean;
  lockRecordAfterEnrollment: boolean;
};

export function AdminSettingsConsole() {
  const [settings, setSettings] = useState<SettingsState>({
    enforceMfa: true,
    sessionTimeoutMinutes: 30,
    autoIssueInvoiceOnApproval: true,
    lockRecordAfterEnrollment: true
  });
  const [notice, setNotice] = useState<string | null>(null);

  function saveSettings() {
    setNotice("Settings saved locally for configuration preview. Connect to persistent settings service next.");
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Admin Oversight Settings</h1>
        <p className="mt-2 text-slate-600">
          Governance controls for security policy, workflow automation, and record integrity.
        </p>
      </header>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <article className="admin-content-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Security and workflow policy</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={settings.enforceMfa}
            onChange={event => setSettings(prev => ({ ...prev, enforceMfa: event.target.checked }))}
            type="checkbox"
          />
          <span>Enforce MFA for all admin users</span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Session timeout (minutes)</span>
          <input
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
            min={5}
            onChange={event =>
              setSettings(prev => ({
                ...prev,
                sessionTimeoutMinutes: Number(event.target.value) || prev.sessionTimeoutMinutes
              }))
            }
            type="number"
            value={settings.sessionTimeoutMinutes}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={settings.autoIssueInvoiceOnApproval}
            onChange={event =>
              setSettings(prev => ({ ...prev, autoIssueInvoiceOnApproval: event.target.checked }))
            }
            type="checkbox"
          />
          <span>Auto-create finance invoice when application is approved</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={settings.lockRecordAfterEnrollment}
            onChange={event =>
              setSettings(prev => ({ ...prev, lockRecordAfterEnrollment: event.target.checked }))
            }
            type="checkbox"
          />
          <span>Lock admissions records after enrollment conversion</span>
        </label>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={saveSettings}
          type="button"
        >
          Save oversight settings
        </button>
      </article>
    </section>
  );
}

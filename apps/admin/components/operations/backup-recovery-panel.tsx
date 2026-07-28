"use client";

import { useMemo, useState, useTransition } from "react";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import type {
  BackupHistoryEntry,
  BackupHistoryStatus,
  BackupRecoverySnapshot,
  ReadinessStatus,
  RestoreAttempt,
  RestoreAttemptKind,
  RestoreAttemptStatus
} from "@/lib/backup-recovery/operations";

type BackupRecoveryPanelProps = {
  canManageBackups: boolean;
  canRunRestore: boolean;
  initialSnapshot: BackupRecoverySnapshot;
  viewerRole: keyof typeof ROLE_LABELS;
};

const backupStatusClasses: Record<BackupHistoryStatus, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  WARNING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-700"
};

const readinessClasses: Record<ReadinessStatus, string> = {
  READY: "bg-emerald-100 text-emerald-700",
  WARNING: "bg-amber-100 text-amber-800",
  ACTION_REQUIRED: "bg-red-100 text-red-700"
};

const restoreStatusClasses: Record<RestoreAttemptStatus, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  WARNING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-700"
};

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString("en-KE") : "Not available";
}

function getInitialBackupId(snapshot: BackupRecoverySnapshot) {
  return snapshot.history.find(entry => entry.status === "SUCCESS")?.id ?? snapshot.history[0]?.id ?? "";
}

export function BackupRecoveryPanel({
  canManageBackups,
  canRunRestore,
  initialSnapshot,
  viewerRole
}: BackupRecoveryPanelProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedBackupId, setSelectedBackupId] = useState(getInitialBackupId(initialSnapshot));
  const [dryRun, setDryRun] = useState(true);
  const [restoreKind, setRestoreKind] = useState<RestoreAttemptKind>("DRILL");
  const [reason, setReason] = useState("Scheduled recovery validation");
  const [confirmationText, setConfirmationText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const expectedConfirmation = useMemo(() => {
    return `${dryRun ? "DRY-RUN" : "RESTORE"} ${selectedBackupId}`;
  }, [dryRun, selectedBackupId]);

  const selectedBackup = useMemo(() => {
    return snapshot.history.find(entry => entry.id === selectedBackupId) ?? null;
  }, [selectedBackupId, snapshot.history]);

  function applySnapshot(nextSnapshot: BackupRecoverySnapshot) {
    setSnapshot(nextSnapshot);
    setSelectedBackupId(current => current || getInitialBackupId(nextSnapshot));
  }

  function triggerBackup() {
    startTransition(async () => {
      const response = await fetch("/api/operations/backup-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_backup" })
      });

      const payload = await response.json();
      if (!response.ok) {
        setNotice(payload.error ?? "Could not trigger manual backup.");
        return;
      }

      applySnapshot(payload.snapshot);
      setSelectedBackupId(payload.snapshot.history[0]?.id ?? "");
      setNotice("Manual backup completed through the safe local rehearsal flow.");
    });
  }

  function submitRestore() {
    startTransition(async () => {
      const response = await fetch("/api/operations/backup-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_restore",
          backupId: selectedBackupId,
          confirmationText,
          dryRun,
          kind: restoreKind,
          reason
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        if (payload.snapshot) {
          applySnapshot(payload.snapshot);
        }
        setNotice(payload.error ?? "Restore workflow could not be completed.");
        return;
      }

      applySnapshot(payload.snapshot);
      setAcknowledged(false);
      setConfirmationText("");
      setNotice(
        dryRun
          ? "Restore dry run completed and logged to the audit stream."
          : "Sandbox restore simulation completed and logged to the audit stream."
      );
    });
  }

  return (
    <section className="space-y-4">
      <article className="admin-content-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Backup & disaster recovery
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Operations resilience</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Monitor backup coverage, verify recovery readiness, and run restore drills through a safe
              local workflow when infrastructure credentials are unavailable.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Cadence</p>
            <p>{snapshot.overview.cadence}</p>
            <p className="mt-2 text-xs text-slate-500">
              Viewer role: {ROLE_LABELS[viewerRole]} {canRunRestore ? "(full control)" : "(read-only)"}
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Last successful backup"
          note={`Initiated by ${snapshot.overview.latestBackupInitiator ?? "n/a"}`}
          status={snapshot.overview.latestBackupStatus ?? "SUCCESS"}
          value={formatTimestamp(snapshot.overview.lastBackupAt)}
        />
        <MetricCard
          label="Next scheduled backup"
          note={`RPO target: ${snapshot.overview.recoveryPointObjective}`}
          status="SUCCESS"
          value={formatTimestamp(snapshot.overview.nextScheduledBackupAt)}
        />
        <MetricCard
          label="Recovery readiness"
          note={`RTO target: ${snapshot.overview.recoveryTimeObjective}`}
          status={snapshot.overview.recoveryReadinessStatus}
          value={snapshot.overview.recoveryReadinessStatus.replace("_", " ")}
        />
        <MetricCard
          label="Last successful restore drill"
          note={snapshot.overview.storageTarget}
          status={snapshot.overview.exportVerificationStatus}
          value={formatTimestamp(snapshot.overview.lastSuccessfulRestoreDrillAt)}
        />
      </div>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      {!canManageBackups && !canRunRestore && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          This view is read-only for {ROLE_LABELS[viewerRole]}. Only Super Admin can trigger backups or
          execute restore workflows.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <article className="admin-content-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Backup controls</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manual backups use a local-safe rehearsal path while preserving history, initiator details,
                and verification notes.
              </p>
            </div>
            {canManageBackups && (
              <button
                className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={isPending}
                onClick={triggerBackup}
                type="button"
              >
                Trigger manual backup
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Completed</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Trigger</th>
                  <th className="px-3 py-2">Initiator</th>
                  <th className="px-3 py-2">Artifact</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map(entry => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-500">{formatTimestamp(entry.startedAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatTimestamp(entry.completedAt)}</td>
                    <td className="px-3 py-2">
                      <StatusPill className={backupStatusClasses[entry.status]} text={entry.status} />
                    </td>
                    <td className="px-3 py-2">{entry.trigger}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{entry.initiatedBy}</p>
                      <p className="text-xs text-slate-500">{entry.initiatorRole}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{entry.artifactLabel}</p>
                      <p className="text-xs text-slate-500">{entry.notes}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-content-card">
          <h2 className="text-lg font-semibold text-slate-900">Integrity & readiness checks</h2>
          <div className="mt-4 space-y-3">
            {snapshot.readinessChecks.map(check => (
              <div key={check.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                  <StatusPill className={readinessClasses[check.status]} text={check.status.replace("_", " ")} />
                </div>
                <p className="mt-1 text-sm text-slate-600">{check.detail}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Last checked: {formatTimestamp(check.lastCheckedAt)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="admin-content-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Guided restore workflow</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick a backup, choose a dry run or sandbox replay, document the reason, and pass the
              confirmation gate before execution.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Required confirmation: <span className="font-semibold text-slate-900">{expectedConfirmation}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Restore point</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={!canRunRestore}
              onChange={event => setSelectedBackupId(event.target.value)}
              value={selectedBackupId}
            >
              {snapshot.history.map(entry => (
                <option key={entry.id} value={entry.id}>
                  {entry.id} - {entry.status} - {formatTimestamp(entry.completedAt)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Run type</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={!canRunRestore}
              onChange={event => setDryRun(event.target.value === "DRY_RUN")}
              value={dryRun ? "DRY_RUN" : "SANDBOX_RESTORE"}
            >
              <option value="DRY_RUN">Dry run simulation</option>
              <option value="SANDBOX_RESTORE">Local sandbox replay</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Workflow type</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={!canRunRestore}
              onChange={event => setRestoreKind(event.target.value as RestoreAttemptKind)}
              value={restoreKind}
            >
              <option value="DRILL">Restore drill</option>
              <option value="INCIDENT">Incident recovery</option>
            </select>
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Selected backup scope</p>
            <p className="mt-1">{selectedBackup?.scope ?? "Select a restore point"}</p>
            <p className="mt-2 text-xs text-slate-500">
              Export verified: {selectedBackup?.exportVerified ? "Yes" : "No"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Reason / incident context</span>
            <textarea
              className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2"
              disabled={!canRunRestore}
              onChange={event => setReason(event.target.value)}
              value={reason}
            />
          </label>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <label className="block">
              <span className="mb-1 block font-medium text-slate-700">Confirmation phrase</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                disabled={!canRunRestore}
                onChange={event => setConfirmationText(event.target.value)}
                placeholder={expectedConfirmation}
                value={confirmationText}
              />
            </label>
            <label className="flex items-start gap-2 text-slate-600">
              <input
                checked={acknowledged}
                disabled={!canRunRestore}
                onChange={event => setAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>
                I understand this workflow records a full audit trail and, outside dry-run mode, performs only
                a local sandbox replay in the current mock-safe implementation.
              </span>
            </label>
            <button
              className="w-full rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
              disabled={!canRunRestore || !selectedBackupId || !acknowledged || isPending}
              onClick={submitRestore}
              type="button"
            >
              {dryRun ? "Run restore dry run" : "Run sandbox restore"}
            </button>
            {!canRunRestore && (
              <p className="text-xs text-slate-500">
                Restore execution is restricted to Super Admin. Principals can review the workflow and
                current readiness state only.
              </p>
            )}
          </div>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <HistoryCard entries={snapshot.history} />
        <RestoreAttemptsCard entries={snapshot.restoreAttempts} />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  status
}: {
  label: string;
  value: string;
  note: string;
  status: BackupHistoryStatus | ReadinessStatus;
}) {
  const tone =
    status === "SUCCESS" || status === "READY"
      ? "text-emerald-700"
      : status === "WARNING"
        ? "text-amber-800"
        : "text-red-700";

  return (
    <article className="admin-content-card">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className={`mt-1 text-xs font-semibold ${tone}`}>{note}</p>
    </article>
  );
}

function StatusPill({ text, className }: { text: string; className: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{text}</span>;
}

function HistoryCard({ entries }: { entries: BackupHistoryEntry[] }) {
  return (
    <article className="admin-content-card">
      <h2 className="text-lg font-semibold text-slate-900">Backup history details</h2>
      <div className="mt-3 space-y-3">
        {entries.map(entry => (
          <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{entry.id}</p>
                <p className="text-xs text-slate-500">{entry.scope}</p>
              </div>
              <StatusPill className={backupStatusClasses[entry.status]} text={entry.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
            <p className="mt-2 text-xs text-slate-500">
              Completed {formatTimestamp(entry.completedAt)} • Initiated by {entry.initiatedBy}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function RestoreAttemptsCard({ entries }: { entries: RestoreAttempt[] }) {
  return (
    <article className="admin-content-card">
      <h2 className="text-lg font-semibold text-slate-900">Restore attempts & outcomes</h2>
      <div className="mt-3 space-y-3">
        {entries.map(entry => (
          <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {entry.mode === "DRY_RUN" ? "Dry run" : "Sandbox restore"} • {entry.kind}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.backupId} • Requested by {entry.requestedBy}
                </p>
              </div>
              <StatusPill className={restoreStatusClasses[entry.status]} text={entry.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{entry.outcome}</p>
            <p className="mt-2 text-xs text-slate-500">
              {formatTimestamp(entry.requestedAt)} • Reason: {entry.reason}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

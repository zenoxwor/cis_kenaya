# Backup and disaster recovery runbook

## Cadence

- Nightly application backup at **02:00 EAT**
- Weekly immutable export every **Saturday**
- Restore drill every **7-14 days**

## Backup procedure

1. Sign in as **Super Admin**.
2. Open **Admin -> Backup & Recovery** (`/admin/operations`).
3. Review readiness indicators and confirm the latest export verification is **READY**.
4. Use **Trigger manual backup** when a release, incident, or operational checkpoint needs an extra restore point.
5. Confirm the new history entry shows timestamp, status, initiator, and verified export notes.

## Restore workflow

1. Open **Admin -> Backup & Recovery**.
2. Select the target backup artifact from the restore-point list.
3. Choose **Dry run simulation** for validation-only rehearsals, or **Local sandbox replay** for the current safe non-production restore path.
4. Record the incident or drill reason.
5. Check the acknowledgement box and enter the required confirmation phrase exactly.
6. Run the workflow and confirm the attempt appears in the restore outcomes list.
7. Review the audit console (`/admin/super-admin/audit`) for `backup_recovery.restore_requested` and `backup_recovery.restore_completed`.

## Incident checklist

1. Freeze writes or announce degraded mode to operators.
2. Confirm the latest successful backup and verify export integrity.
3. Notify the incident commander, principal stakeholder, and communications owner.
4. Run a dry run first unless time-critical recovery requires otherwise.
5. Execute the sandbox restore workflow and capture outcome details.
6. Validate admin login, core data visibility, and audit stream continuity.
7. Record follow-up actions, unresolved gaps, and the next restore drill date.

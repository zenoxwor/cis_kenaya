# CIS Kenaya

This repository now has two separate surfaces:

1. **Public website (existing)** at repo root (`index.html`, `styles.css`).
2. **Admin system foundation (new)** in `apps/admin` using Next.js App Router.

The admin app is designed for phased expansion into a production school management and documentation platform with RBAC and PostgreSQL/Prisma-ready modeling.

Admin operations resilience now includes a backup and disaster recovery surface at `/admin/operations`, with role-aware controls, restore-drill audit logging, and a runbook in `apps/admin/docs/backup-recovery-runbook.md`.

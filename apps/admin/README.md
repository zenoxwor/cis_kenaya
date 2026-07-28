# Kenya CIS Admin App

This folder contains the **separate internal admin surface** built with Next.js App Router.

## Why separate

- Public preregistration website remains at repo root (`index.html`, `styles.css`).
- Admin capabilities evolve independently without disrupting the public site.

## Foundation included

- Next.js + TypeScript + Tailwind setup.
- Responsive admin shell (collapsible sidebar, top navbar, profile controls placeholder).
- Role-aware route placeholders for:
  - Super Admin
  - Principal
  - Reception / Admissions
  - Finance
- RBAC matrix foundation under `lib/rbac` with:
  - explicit role constants (`SUPER_ADMIN`, `PRINCIPAL`, `RECEPTION`, `FINANCE`)
  - route-access map
  - navigation-visibility map
  - action permissions (`view/create/edit/approve/export/override`)
- Prisma schema direction for:
  - User, Role, Student, Guardian, Application, Enrollment
  - StudentDocument, FeeInvoice, Payment, VisitorLog, AuditLog
  - status enums for application, document, student, and payment lifecycles

## Authentication foundation

- Sign-in route: `/sign-in`
- Mock sign-in endpoint (development): `POST /api/auth/mock-sign-in`
- Sign-out endpoint: `POST /api/auth/sign-out`
- Middleware-enforced route protection on `/admin/*` using RBAC route matrix.
- Session storage: HTTP-only cookie (`kenya_admin_session`) with structured payload.
- Sign-in UI uses a polished username/password form with clear credential error feedback.

`AUTH_MODE` controls behavior:

- `mock` (default in non-production): username/password are validated against `lib/auth/mock-users.ts` (e.g. `superadmin` / `admin123`)
- `external`: reserved for production identity provider integration; mock sign-in is blocked

## Registration wizard foundation

- Route: `/admin/registration` (supports optional `?draft=<id>`).
- 6-step flow with per-step validation and progress UI.
- Draft persistence abstraction in `lib/registration/draft-repository.ts` currently backed by localStorage.
- Export hooks:
  - JSON export (client download)
  - Print (`window.print`)
  - PDF endpoint hook at `POST /api/registration/export/pdf` (placeholder for server PDF rendering)
- Status alignment with schema enums (application/document/student/payment) via `lib/registration/statuses.ts`.

## Phase-one dashboards

- Role-specific dashboard pages now implemented for:
  - `/admin/super-admin`
  - `/admin/principal`
  - `/admin/reception`
  - `/admin/finance`
- Each includes KPI cards, recent activity, action shortcuts, and role-tailored operational tables.
- Dashboard rendering is modular via `components/dashboard/role-dashboard.tsx`.
- Structured placeholder datasets live under `lib/dashboard/*` and are ready to be swapped with backend queries.
- Super Admin dashboard includes RBAC capability snapshot data using current permission matrix helpers.

## Operational workflow wiring

- Reusable workflow engine and action guards:
  - `lib/workflow/types.ts`
  - `lib/workflow/engine.ts`
  - `lib/workflow/repository.ts`
  - `lib/workflow/mock-data.ts`
- Shared workflow board UI:
  - `components/workflow/role-workflow-board.tsx`
- Role-specific operational routes now execute lifecycle actions with RBAC-aware controls:
  - Reception intake queue: `/admin/reception/applications`
  - Principal decisioning: `/admin/principal/reports`
  - Finance invoice/payment hooks: `/admin/finance/invoices`, `/admin/finance/payments`
  - Super Admin override lane: `/admin/super-admin/users`
- Flow coverage includes:
  - submission -> document request/verification -> review -> approve/reject/waitlist
  - approved application -> invoice issue -> payment settlement -> enrollment conversion

## Reporting, analytics, settings, and audit controls

- Export-ready reporting surfaces:
  - Principal analytics: `/admin/principal/analytics`
  - Reception analytics: `/admin/reception/analytics`
  - Finance reporting: `/admin/finance/reports`
- Reusable report component and export hooks:
  - `components/reporting/report-surface.tsx`
  - JSON/CSV/Print export in-client
  - PDF export endpoint hook: `POST /api/reports/export/pdf`
- Audit controls:
  - Super Admin audit console: `/admin/super-admin/audit`
  - Mock audit data aligned with `AuditLog` model direction in `lib/audit/*`
- Settings oversight:
  - Super Admin policy/settings console: `/admin/super-admin/settings`
  - Security/session/workflow governance placeholders structured for backend persistence wiring.

## Principal staff account management

- Principal route: `/admin/principal/staff-accounts`
- LocalStorage-backed mock CRUD for teacher/worker/staff admin accounts:
  - list accounts
  - create account (Full Name, Username, Email, Role, Temporary Password)
  - edit name/role/status
  - deactivate/activate account
- Structured for easy repository swap to database persistence later.

## Exams and grading module

- New routes:
  - `/admin/exams` — term/component overview plus analytics snapshots
  - `/admin/exams/marks` — class/subject/component marks-entry grid with inline validation
  - `/admin/exams/reports` — per-student report card view with print-friendly layout
- Mark validation enforces `0 <= rawMark <= component.maxMarks`.
- Role gating:
  - Teacher and Reception can enter/save/submit marks
  - Principal and Super Admin can verify submitted marks and approve/publish report cards
- Analytics include:
  - class average per subject
  - top performers per term
  - failing students list
- Mock auth includes a Teacher account (`teacher` / `admin123`) for marks-entry workflows.

## Document center expansion

- New route: `/admin/documents` with lifecycle-aware student document hub.
- Document categories now include: admission, identity, medical, academic, consent, finance.
- Verification statuses and transitions are enforced in the document repository:
  - `missing -> uploaded -> verified/rejected -> expired`
  - `rejected/expired -> uploaded` for re-submission.
- Expiry metadata and reminder scheduling fields are tracked per document:
  - `expiresAt`, `reminderLeadDays`, `nextReminderAt`, `lastReminderAt`
  - missing-document reminder cadence and next-run timestamps.
- Role workflow controls:
  - Reception uploads/updates documents and expiry schedules
  - Principal/Super Admin verify or reject
  - Teacher has read-only, assigned-class scoped visibility.
- Reminder bulk actions (mock send) are wired into Communications history via in-memory campaign/delivery logs.

## Run locally

```bash
npm install
npm run dev
```

Then open `/sign-in`.

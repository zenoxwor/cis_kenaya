# Kenaya CIS Admin App

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

## Run locally

```bash
npm install
npm run dev
```

Then open `/admin`.

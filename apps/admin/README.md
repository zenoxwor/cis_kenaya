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
- RBAC role/permission/navigation model skeleton under `lib/rbac`.
- Prisma schema direction for:
  - Single main campus
  - User + roles
  - 6-step registration draft progression
  - Finance ledger
  - Audit logs

## Run locally

```bash
npm install
npm run dev
```

Then open `/admin`.

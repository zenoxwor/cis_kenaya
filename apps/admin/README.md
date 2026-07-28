# CIS Kenya — Admin Portal

Next.js 14 App Router + TypeScript admin application for Capital International School Kenya.

---

## Quick start (development)

```bash
cd apps/admin
npm install
cp .env.example .env.local
# Edit .env.local — set AUTH_SECRET (min 32 chars)
npm run dev
# Open http://localhost:3001
```

Default dev credentials (mock mode):
- `admin` / `admin123` → role: admin
- `superadmin` / `super123` → role: superadmin

---

## Authentication

The app supports two auth modes controlled by the `AUTH_MODE` environment variable.

### `AUTH_MODE=mock` (development only)

- Uses hardcoded credentials defined in `MOCK_ADMIN_USERNAME` / `MOCK_ADMIN_PASSWORD`.
- **Blocked at startup if `NODE_ENV=production`.** The app will not start.
- A console warning is printed on every startup as a reminder.

### `AUTH_MODE=external` (production)

- Delegates credential verification to `EXTERNAL_AUTH_URL/verify`.
- Replace the placeholder in `src/lib/auth.ts → verifyExternal()` with your real IdP/SSO client.
- The login page shows an operator-visible notice that external auth is required.

---

## Session security

Sessions are stored in a **signed + encrypted HTTP-only cookie** via [iron-session](https://github.com/vvo/iron-session).

| Cookie attribute | Value |
|-----------------|-------|
| `HttpOnly`      | ✅ Always — JS cannot access the cookie |
| `Secure`        | ✅ In production (`NODE_ENV=production`) |
| `SameSite`      | `lax` — blocks cross-site POST CSRF while allowing normal navigations |
| `Path`          | `/` |
| `Max-Age`       | `SESSION_MAX_AGE_SECONDS` (default 8 h) |

**Sign-out** calls `session.destroy()` server-side, which removes the cookie entirely — no residual session data.

---

## RBAC

Three roles are defined (lowest → highest privilege):

| Role          | Access                               |
|---------------|--------------------------------------|
| `viewer`      | Read-only: dashboard, reports         |
| `admin`       | + Students management                 |
| `superadmin`  | + Settings, user management           |

Enforcement happens at **two layers**:

1. **Middleware** (`src/middleware.ts`) — checks session and role on every request before the route renders.
2. **Server Components** — `requireRole(minRole)` in each page throws a redirect if the session is insufficient.

---

## Environment variables

See [`.env.example`](.env.example) for the full reference.

### Required Vercel env vars

| Variable            | Required | Notes                                        |
|---------------------|----------|----------------------------------------------|
| `AUTH_SECRET`       | ✅ Always | Min 32 chars; use Vercel Secret store         |
| `AUTH_MODE`         | ✅ Always | Must be `external` in production              |
| `EXTERNAL_AUTH_URL` | ✅ Prod   | Required when `AUTH_MODE=external`            |
| `SESSION_MAX_AGE_SECONDS` | No | Defaults to 28800 (8 h)                 |

---

## Project structure

```
apps/admin/
  src/
    app/
      (dashboard)/          # Protected routes (require auth)
        layout.tsx          # Header + nav chrome
        dashboard/page.tsx  # Dashboard (viewer+)
        students/page.tsx   # Students (admin+)
      login/page.tsx        # Public sign-in page
      unauthorized/page.tsx # 403 page
      api/
        auth/
          login/route.ts    # POST — verify credentials, create session
          logout/route.ts   # POST — destroy session
    lib/
      env.ts      # Validated env vars (zod); hard-fails on bad config
      session.ts  # iron-session config + helpers
      auth.ts     # AUTH_MODE-switched credential verification
      rbac.ts     # Role definitions + requireRole() helper
    types/
      auth.ts     # SessionUser, Role, AuthMode types
    components/
      login-form.tsx       # Client component — sign-in form
      sign-out-button.tsx  # Client component — sign-out button
    middleware.ts  # Edge middleware — auth guard + RBAC
```

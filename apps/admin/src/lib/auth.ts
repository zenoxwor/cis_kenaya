/**
 * Authentication logic — mode-switched between "mock" and "external".
 *
 * Mock mode (development only):
 *   - Hardcoded or env-configured credentials (MOCK_ADMIN_USERNAME / MOCK_ADMIN_PASSWORD).
 *   - A startup warning is printed to remind operators that mock mode is active.
 *   - Blocked entirely in NODE_ENV=production by env.ts validation.
 *
 * External mode (production):
 *   - Delegates credential verification to EXTERNAL_AUTH_URL.
 *   - The integration point is a thin POST /verify call that returns a role claim.
 *   - Replace the placeholder with your real IdP / SSO client when ready.
 */

import { env } from "@/lib/env";
import type { SessionUser } from "@/types/auth";

// ─── Startup notice ───────────────────────────────────────────────────────────
// Skip warning during next build (NEXT_PHASE=phase-production-build)
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (env.AUTH_MODE === "mock" && env.NODE_ENV !== "test" && !isBuildPhase) {
  console.warn(
    "\n⚠️  [admin] AUTH_MODE=mock is active — using development credentials.\n" +
      "   Do NOT use this in production. Set AUTH_MODE=external.\n"
  );
}

// ─── Mock auth ────────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  username: string;
  password: string;
  role: SessionUser["role"];
}

/** Hardcoded mock users for development. Add more as needed. */
const MOCK_USERS: MockUser[] = [
  {
    id: "mock-001",
    username: env.MOCK_ADMIN_USERNAME,
    password: env.MOCK_ADMIN_PASSWORD,
    role: "admin",
  },
  {
    id: "mock-super",
    username: "superadmin",
    password: "super123",
    role: "superadmin",
  },
];

async function verifyMock(username: string, password: string): Promise<SessionUser | null> {
  const match = MOCK_USERS.find(
    (u) => u.username === username && u.password === password
  );
  if (!match) return null;
  return {
    id: match.id,
    username: match.username,
    role: match.role,
    createdAt: new Date().toISOString(),
  };
}

// ─── External auth ────────────────────────────────────────────────────────────

async function verifyExternal(username: string, password: string): Promise<SessionUser | null> {
  // TODO: Replace with your real IdP/SSO integration.
  // This placeholder performs a POST to EXTERNAL_AUTH_URL/verify and
  // expects { id, username, role } on success or a 401 on failure.
  const res = await fetch(`${env.EXTERNAL_AUTH_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    // Never cache auth requests
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { id: string; username: string; role: SessionUser["role"] };
  return {
    id: data.id,
    username: data.username,
    role: data.role,
    createdAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Verify credentials against the configured AUTH_MODE.
 * Returns a SessionUser on success or null on failure.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  if (env.AUTH_MODE === "mock") {
    return verifyMock(username, password);
  }
  return verifyExternal(username, password);
}

/** Human-readable description of the current auth mode (shown on login page). */
export function getAuthModeLabel(): string {
  if (env.AUTH_MODE === "mock") {
    return "Development (Mock) — not for production use";
  }
  return "External Auth Provider";
}

/** Returns true when external auth is required (i.e. operator must configure IdP). */
export function isExternalAuthRequired(): boolean {
  return env.AUTH_MODE === "external";
}

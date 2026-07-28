/**
 * Iron-session configuration and helpers.
 *
 * Session data is stored exclusively in a signed + encrypted HTTP-only cookie.
 * No server-side session store is required.
 *
 * Cookie security:
 *   - httpOnly  : inaccessible to JavaScript (mitigates XSS theft)
 *   - secure    : HTTPS-only in production
 *   - sameSite  : "lax" — allows top-level navigations while blocking CSRF
 *   - path      : "/" — applies to all admin routes
 *   - maxAge    : configurable (default 8 h); session is auto-expired by browser
 *
 * Sign-out: call destroySession() which calls session.destroy() and clears
 * the cookie so no session residue remains.
 */

import { getIronSession } from "iron-session";
import type { IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { AdminSession } from "@/types/auth";

export const SESSION_COOKIE_NAME = "cis_admin_session";

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: env.AUTH_SECRET,
    cookieOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // maxAge is seconds; iron-session converts it to an expires Set-Cookie attribute
      maxAge: env.SESSION_MAX_AGE_SECONDS,
    },
  };
}

/** Get the current iron-session (reads from request cookies). */
export async function getSession(): Promise<IronSession<AdminSession>> {
  return getIronSession<AdminSession>(await cookies(), getSessionOptions());
}

/**
 * Destroy the session and clear the cookie.
 * Must be called inside a Server Action or Route Handler (has cookie write access).
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

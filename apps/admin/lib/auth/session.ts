import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload, serializeSessionPayload } from "@/lib/auth/cookie-session";
import { buildSignInPath } from "@/lib/auth/paths";
import type { SessionUser } from "@/lib/auth/types";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type { SessionUser } from "@/lib/auth/types";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = parseSessionPayload(sessionCookie);
  return payload?.user ?? null;
}

export async function requireCurrentUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user) {
    return user;
  }

  redirect(buildSignInPath(nextPath));
}

export function createSessionCookieValue(user: SessionUser) {
  return serializeSessionPayload({
    v: 1,
    user
  });
}

export function createExpiredSessionCookie() {
  return {
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0
  };
}

export function createActiveSessionCookie(value: string) {
  return {
    name: AUTH_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

export { buildSignInPath } from "@/lib/auth/paths";

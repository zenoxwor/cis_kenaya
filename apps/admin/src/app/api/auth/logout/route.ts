/**
 * POST /api/auth/logout
 *
 * Destroys the iron-session cookie entirely, invalidating the session.
 * Accepts POST to allow use from forms and fetch(); GET is not supported
 * to prevent CSRF via navigation-based logout.
 *
 * After successful logout, responds with 200 + JSON { ok: true }.
 * The client should redirect to /login.
 */

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

// Explicitly disallow GET to prevent inadvertent session destruction via link prefetch
export async function GET() {
  return NextResponse.json({ error: "Method not allowed — use POST" }, { status: 405 });
}

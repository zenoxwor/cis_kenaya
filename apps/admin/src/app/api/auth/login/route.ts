/**
 * POST /api/auth/login
 *
 * Accepts JSON { username, password }.
 * Verifies credentials via the configured AUTH_MODE handler.
 * On success, writes the user into the iron-session cookie and returns 200.
 * On failure, returns 401 without revealing which field was wrong.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyCredentials } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { username, password } = parsed.data;
  const user = await verifyCredentials(username, password);

  if (!user) {
    // Deliberately vague to avoid username enumeration
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.user = user;
  await session.save();

  return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
}

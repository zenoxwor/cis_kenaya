import { NextResponse } from "next/server";
import { getAuthMode } from "@/lib/auth/config";
import { findMockUserByEmail } from "@/lib/auth/mock-users";
import { isSafeInternalPath } from "@/lib/auth/paths";
import { createActiveSessionCookie, createSessionCookieValue } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (getAuthMode() !== "mock") {
    return NextResponse.json({ error: "Mock auth is disabled." }, { status: 403 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const requestedNext = String(formData.get("next") ?? "/admin");
  const nextPath = isSafeInternalPath(requestedNext) ? requestedNext : "/admin";
  const user = findMockUserByEmail(email);

  if (!user) {
    const failureUrl = new URL(`/sign-in?error=invalid_user&next=${encodeURIComponent(nextPath)}`, request.url);
    return NextResponse.redirect(failureUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  const sessionCookieValue = createSessionCookieValue(user);
  response.cookies.set(createActiveSessionCookie(sessionCookieValue));
  return response;
}

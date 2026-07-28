import { NextResponse } from "next/server";
import { getAuthMode } from "@/lib/auth/config";
import { findMockUserByCredentials } from "@/lib/auth/mock-users";
import { isSafeInternalPath } from "@/lib/auth/paths";
import { createActiveSessionCookie, createSessionCookieValue } from "@/lib/auth/session";
import { toSessionUser, verifyPassword } from "@/lib/admin/user-management";
import { prisma } from "@/lib/db/client";
import { logAuditEvent } from "@/lib/observability/audit-stream";

async function findManagedUserByCredentials(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { email: normalizedUsername },
    include: { role: true }
  });
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return toSessionUser(user);
}

export async function POST(request: Request) {
  const ipAddress = request.headers.get("x-forwarded-for");

  if (getAuthMode() !== "mock") {
    logAuditEvent({
      actor: { id: null, role: null, name: null, ipAddress },
      action: "auth.sign_in",
      entity: "Session",
      entityId: "mock-auth",
      module: "auth",
      status: "denied",
      metadata: { reason: "mock_auth_disabled" }
    });
    return NextResponse.json({ error: "Mock auth is disabled." }, { status: 403 });
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestedNext = String(formData.get("next") ?? "/admin");
  const nextPath = isSafeInternalPath(requestedNext) ? requestedNext : "/admin";
  const user =
    findMockUserByCredentials(username, password) ??
    (await findManagedUserByCredentials(username, password));

  if (!user) {
    logAuditEvent({
      actor: { id: null, role: null, name: username.trim() || null, ipAddress },
      action: "auth.sign_in",
      entity: "Session",
      entityId: "mock-auth",
      module: "auth",
      status: "failure",
      metadata: { username: username.trim().toLowerCase() }
    });
    const failureUrl = new URL(
      `/sign-in?error=invalid_credentials&next=${encodeURIComponent(nextPath)}`,
      request.url
    );
    return NextResponse.redirect(failureUrl, 303);
  }
  if (!user.isActive) {
    const failureUrl = new URL(
      `/sign-in?error=inactive_account&next=${encodeURIComponent(nextPath)}`,
      request.url
    );
    return NextResponse.redirect(failureUrl, 303);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  const sessionCookieValue = createSessionCookieValue(user);
  response.cookies.set(createActiveSessionCookie(sessionCookieValue));
  logAuditEvent({
    actor: { id: user.id, role: user.role, name: user.fullName, ipAddress },
    action: "auth.sign_in",
    entity: "Session",
    entityId: user.id,
    module: "auth",
    status: "success",
    metadata: { nextPath }
  });
  return response;
}

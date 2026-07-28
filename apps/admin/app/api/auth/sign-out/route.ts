import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { createExpiredSessionCookie } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/observability/audit-stream";

export async function POST(request: Request) {
  const rawSession = request.headers.get("cookie") ?? "";
  const cookieValue = rawSession
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
  const session = parseSessionPayload(cookieValue);

  logAuditEvent({
    actor: {
      id: session?.user.id ?? null,
      role: session?.user.role ?? null,
      name: session?.user.fullName ?? null,
      ipAddress: request.headers.get("x-forwarded-for")
    },
    action: "auth.sign_out",
    entity: "Session",
    entityId: session?.user.id ?? "anonymous",
    module: "auth",
    status: "success",
    metadata: {}
  });

  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  response.cookies.set(createExpiredSessionCookie());
  return response;
}

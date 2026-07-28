import { NextRequest, NextResponse } from "next/server";
import { getTriggerConfig, updateTriggerConfig } from "@/lib/communications/triggers";
import type { TriggerConfig } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";

export async function GET() {
  const config = getTriggerConfig();
  return NextResponse.json({ success: true, config });
}

export async function PATCH(req: NextRequest) {
  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(session.user.role, "settings", "edit")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Partial<TriggerConfig>;
  const config = updateTriggerConfig(body);
  return NextResponse.json({ success: true, config });
}

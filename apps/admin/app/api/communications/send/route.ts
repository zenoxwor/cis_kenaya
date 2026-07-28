import { NextRequest, NextResponse } from "next/server";
import { sendCampaign } from "@/lib/communications/repository";
import type { ComposePayload } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";

export async function POST(req: NextRequest) {
  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(session.user.role, "communication", "create")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as ComposePayload;

  if (!body.templateId || !body.audienceFilter) {
    return NextResponse.json({ success: false, error: "templateId and audienceFilter are required" }, { status: 400 });
  }

  try {
    const campaign = sendCampaign(body, session.user.id, session.user.fullName);
    return NextResponse.json({ success: true, campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

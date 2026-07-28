import { NextRequest, NextResponse } from "next/server";
import {
  listTemplates,
  createTemplate
} from "@/lib/communications/repository";
import type { MessageCategory, MessageType } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";

export async function GET() {
  const templates = listTemplates();
  return NextResponse.json({ success: true, templates });
}

export async function POST(req: NextRequest) {
  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(session.user.role, "message_template", "create")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name: string;
    subject?: string;
    body: string;
    type: MessageType;
    category: MessageCategory;
  };

  if (!body.name || !body.body) {
    return NextResponse.json({ success: false, error: "name and body are required" }, { status: 400 });
  }

  const template = createTemplate({
    name: body.name,
    subject: body.subject ?? null,
    body: body.body,
    type: body.type ?? "BOTH",
    category: body.category ?? "GENERAL"
  });

  return NextResponse.json({ success: true, template }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import {
  updateTemplate,
  deleteTemplate
} from "@/lib/communications/repository";
import type { MessageCategory, MessageType } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(session.user.role, "message_template", "edit")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    name?: string;
    subject?: string;
    body?: string;
    type?: MessageType;
    category?: MessageCategory;
  };

  const template = updateTemplate(id, {
    name: body.name,
    subject: body.subject,
    body: body.body,
    type: body.type,
    category: body.category
  });

  if (!template) {
    return NextResponse.json(
      { success: false, error: "Template not found or is a system template" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, template });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  if (!canPerformAction(session.user.role, "message_template", "edit")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const deleted = deleteTemplate(id);

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "Template not found or is a system template" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}

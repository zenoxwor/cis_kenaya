import { NextRequest, NextResponse } from "next/server";
import {
  listTemplates,
  createTemplate
} from "@/lib/communications/repository";
import type { MessageCategory, MessageType } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

export async function GET() {
  const templates = listTemplates();
  return NextResponse.json({ success: true, templates });
}

export async function POST(req: NextRequest) {
  try {
    const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = parseSessionPayload(rawSession);
    const ipAddress = req.headers.get("x-forwarded-for");

    if (!session) {
      throw new AppError("Unauthenticated", { code: "UNAUTHENTICATED", statusCode: 401 });
    }

    if (!canPerformAction(session.user.role, "message_template", "create")) {
      logAuditEvent({
        actor: {
          id: session.user.id,
          role: session.user.role,
          name: session.user.fullName,
          ipAddress
        },
        action: "rbac.access_denied",
        entity: "MessageTemplate",
        entityId: "create",
        module: "rbac",
        status: "denied",
        metadata: { permission: "message_template.create" }
      });
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = (await req.json()) as {
      name: string;
      subject?: string;
      body: string;
      type: MessageType;
      category: MessageCategory;
    };

    if (!body.name || !body.body) {
      throw new AppError("name and body are required", {
        code: "VALIDATION_ERROR",
        statusCode: 400
      });
    }

    const template = createTemplate({
      name: body.name,
      subject: body.subject ?? null,
      body: body.body,
      type: body.type ?? "BOTH",
      category: body.category ?? "GENERAL"
    });

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "communication.template_create",
      entity: "MessageTemplate",
      entityId: template.id,
      module: "communications",
      status: "success",
      metadata: { category: template.category, type: template.type }
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  updateTemplate,
  deleteTemplate
} from "@/lib/communications/repository";
import type { MessageCategory, MessageType } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = parseSessionPayload(rawSession);
    const ipAddress = req.headers.get("x-forwarded-for");

    if (!session) {
      throw new AppError("Unauthenticated", { code: "UNAUTHENTICATED", statusCode: 401 });
    }

    if (!canPerformAction(session.user.role, "message_template", "edit")) {
      logAuditEvent({
        actor: {
          id: session.user.id,
          role: session.user.role,
          name: session.user.fullName,
          ipAddress
        },
        action: "rbac.access_denied",
        entity: "MessageTemplate",
        entityId: id,
        module: "rbac",
        status: "denied",
        metadata: { permission: "message_template.edit" }
      });
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
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
      throw new AppError("Template not found or is a system template", {
        code: "NOT_FOUND",
        statusCode: 404
      });
    }

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "communication.template_update",
      entity: "MessageTemplate",
      entityId: id,
      module: "communications",
      status: "success",
      metadata: { category: template.category, type: template.type }
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = parseSessionPayload(rawSession);
    const ipAddress = req.headers.get("x-forwarded-for");

    if (!session) {
      throw new AppError("Unauthenticated", { code: "UNAUTHENTICATED", statusCode: 401 });
    }

    if (!canPerformAction(session.user.role, "message_template", "edit")) {
      logAuditEvent({
        actor: {
          id: session.user.id,
          role: session.user.role,
          name: session.user.fullName,
          ipAddress
        },
        action: "rbac.access_denied",
        entity: "MessageTemplate",
        entityId: id,
        module: "rbac",
        status: "denied",
        metadata: { permission: "message_template.edit" }
      });
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const deleted = deleteTemplate(id);

    if (!deleted) {
      throw new AppError("Template not found or is a system template", {
        code: "NOT_FOUND",
        statusCode: 404
      });
    }

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "communication.template_delete",
      entity: "MessageTemplate",
      entityId: id,
      module: "communications",
      status: "success",
      metadata: {}
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

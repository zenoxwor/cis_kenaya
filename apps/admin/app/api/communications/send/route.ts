import { NextRequest, NextResponse } from "next/server";
import { sendCampaign } from "@/lib/communications/repository";
import type { ComposePayload } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

export async function POST(req: NextRequest) {
  try {
    const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = parseSessionPayload(rawSession);
    const ipAddress = req.headers.get("x-forwarded-for");

    if (!session) {
      logAuditEvent({
        actor: { id: null, role: null, name: null, ipAddress },
        action: "communication.send",
        entity: "MessageCampaign",
        entityId: "unauthenticated",
        module: "communications",
        status: "denied",
        metadata: {}
      });
      throw new AppError("Unauthenticated", { code: "UNAUTHENTICATED", statusCode: 401 });
    }

    if (!canPerformAction(session.user.role, "communication", "create")) {
      logAuditEvent({
        actor: {
          id: session.user.id,
          role: session.user.role,
          name: session.user.fullName,
          ipAddress
        },
        action: "rbac.access_denied",
        entity: "MessageCampaign",
        entityId: "create",
        module: "rbac",
        status: "denied",
        metadata: { permission: "communication.create" }
      });
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = (await req.json()) as ComposePayload;

    if (!body.templateId || !body.audienceFilter) {
      throw new AppError("templateId and audienceFilter are required", {
        code: "VALIDATION_ERROR",
        statusCode: 400
      });
    }

    const campaign = await sendCampaign(body, session.user.id, session.user.fullName);
    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "communication.send",
      entity: "MessageCampaign",
      entityId: campaign.id,
      module: "communications",
      status: "success",
      metadata: {
        templateId: body.templateId,
        audienceFilter: body.audienceFilter,
        scheduledAt: body.scheduledAt ?? null
      }
    });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getTriggerConfig, updateTriggerConfig } from "@/lib/communications/triggers";
import type { TriggerConfig } from "@/lib/communications/types";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { canPerformAction } from "@/lib/rbac/permissions";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

export async function GET() {
  const config = getTriggerConfig();
  return NextResponse.json({ success: true, config });
}

export async function PATCH(req: NextRequest) {
  try {
    const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = parseSessionPayload(rawSession);
    const ipAddress = req.headers.get("x-forwarded-for");

    if (!session) {
      throw new AppError("Unauthenticated", { code: "UNAUTHENTICATED", statusCode: 401 });
    }

    if (!canPerformAction(session.user.role, "settings", "edit")) {
      logAuditEvent({
        actor: {
          id: session.user.id,
          role: session.user.role,
          name: session.user.fullName,
          ipAddress
        },
        action: "rbac.access_denied",
        entity: "TriggerConfig",
        entityId: "communications",
        module: "rbac",
        status: "denied",
        metadata: { permission: "settings.edit" }
      });
      throw new AppError("Forbidden", { code: "FORBIDDEN", statusCode: 403 });
    }

    const body = (await req.json()) as Partial<TriggerConfig>;
    const config = updateTriggerConfig(body);

    logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress
      },
      action: "trigger.config_update",
      entity: "TriggerConfig",
      entityId: "communications",
      module: "communications",
      status: "success",
      metadata: body
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

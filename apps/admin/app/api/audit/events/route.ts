import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";
import { logAuditEvent } from "@/lib/observability/audit-stream";

const eventSchema = z.object({
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  module: z.string().min(1),
  status: z.enum(["success", "failure", "denied", "warning"]),
  metadata: z.record(z.unknown()).optional()
});

export async function POST(req: NextRequest) {
  try {
    const rawSession = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = parseSessionPayload(rawSession);
    if (!session) {
      throw new AppError("Unauthenticated", { code: "UNAUTHENTICATED", statusCode: 401 });
    }

    const body = await req.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Invalid audit event payload", {
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: parsed.error.flatten()
      });
    }

    const event = logAuditEvent({
      actor: {
        id: session.user.id,
        role: session.user.role,
        name: session.user.fullName,
        ipAddress: req.headers.get("x-forwarded-for")
      },
      action: parsed.data.action,
      entity: parsed.data.entity,
      entityId: parsed.data.entityId,
      module: parsed.data.module,
      status: parsed.data.status,
      metadata: parsed.data.metadata ?? {}
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

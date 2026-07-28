import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import {
  deleteManagedUser,
  MANAGED_ROLE_OPTIONS,
  MODULE_PERMISSIONS,
  updateManagedUser
} from "@/lib/admin/user-management";
import { hasPermission } from "@/lib/rbac/module-permissions";
import { ROLE } from "@/lib/rbac/roles";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";

const resetPasswordSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("custom"),
    customPassword: z.string().min(8)
  }),
  z.object({
    mode: z.literal("generated")
  })
]);

const patchUserSchema = z
  .object({
    fullName: z.string().trim().min(2).optional(),
    email: z.string().email().optional(),
    defaultRole: z.enum(MANAGED_ROLE_OPTIONS).optional(),
    permissions: z.array(z.enum(MODULE_PERMISSIONS)).min(1).optional(),
    isActive: z.boolean().optional(),
    resetPassword: resetPasswordSchema.optional()
  })
  .refine(payload => Object.keys(payload).length > 0, "At least one field must be provided.");

function requireSuperAdmin(request: NextRequest) {
  const rawSession = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = parseSessionPayload(rawSession);
  const user = session?.user;

  if (!user) {
    throw new AppError("Unauthenticated request.", { code: "UNAUTHORIZED", statusCode: 401 });
  }

  if (!user.isActive) {
    throw new AppError("Your account is inactive.", { code: "FORBIDDEN", statusCode: 403 });
  }

  if (user.role !== ROLE.SUPER_ADMIN || !hasPermission(user, "super_admin_console")) {
    throw new AppError("Super Admin access is required.", { code: "FORBIDDEN", statusCode: 403 });
  }

  return user;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = requireSuperAdmin(request);
    const { id } = await context.params;
    if (id === actor.id) {
      throw new AppError("Super Admin cannot update own account from this endpoint.", {
        code: "CONFLICT",
        statusCode: 409
      });
    }

    const payload = patchUserSchema.parse(await request.json());
    const result = await updateManagedUser(id, payload);
    return NextResponse.json({ success: true, user: result.user, temporaryPassword: result.temporaryPassword });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = requireSuperAdmin(request);
    const { id } = await context.params;
    if (id === actor.id) {
      throw new AppError("Super Admin cannot delete own account.", {
        code: "CONFLICT",
        statusCode: 409
      });
    }

    await deleteManagedUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeErrorResponse(error);
  }
}


import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { parseSessionPayload } from "@/lib/auth/cookie-session";
import {
  createManagedUser,
  listManagedUsers,
  MANAGED_ROLE_OPTIONS,
  MODULE_PERMISSIONS
} from "@/lib/admin/user-management";
import { hasPermission } from "@/lib/rbac/module-permissions";
import { ROLE } from "@/lib/rbac/roles";
import { AppError, routeErrorResponse } from "@/lib/observability/errors";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  defaultRole: z.enum(MANAGED_ROLE_OPTIONS),
  initialPassword: z.string().min(8),
  permissions: z.array(z.enum(MODULE_PERMISSIONS)).min(1)
});

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

export async function GET(request: NextRequest) {
  try {
    requireSuperAdmin(request);
    const users = await listManagedUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSuperAdmin(request);
    const payload = createUserSchema.parse(await request.json());
    const user = await createManagedUser(payload);
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}


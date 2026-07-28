import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { APP_ROLES } from "@/lib/rbac/roles";
import { requireSuperAdminRequestUser } from "@/lib/auth/api-authorization";
import {
  ensureSystemRoles,
  defaultPermissionsForRole,
  normalizePermissionsForRole,
  toManagedUserResponse,
  toRoleCode,
  hashPassword,
  generateTemporaryPassword
} from "@/lib/admin/user-management";
import { sendPasswordResetEmail } from "@/lib/email/resend";

const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    role: z.enum(APP_ROLES).optional(),
    modulePermissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    passwordAction: z.enum(["none", "set", "generate"]).default("none"),
    password: z.string().min(8).max(200).optional()
  })
  .superRefine((value, ctx) => {
    if (value.passwordAction === "set" && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password is required when passwordAction is set",
        path: ["password"]
      });
    }
  });

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSuperAdminRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const input = parsed.data;
  await ensureSystemRoles(prisma);
  const existingUser = await prisma.user.findUnique({
    where: { id },
    include: { role: true }
  });
  if (!existingUser) {
    return jsonError("User not found", 404);
  }

  const resolvedRole = input.role ?? existingUser.role.code;
  const resolvedPermissions = input.modulePermissions
    ? normalizePermissionsForRole(resolvedRole, input.modulePermissions)
    : input.role
      ? defaultPermissionsForRole(resolvedRole)
      : normalizePermissionsForRole(resolvedRole, existingUser.modulePermissions);

  const updateData: Prisma.UserUpdateInput = {
    fullName: input.fullName?.trim(),
    email: input.email?.trim().toLowerCase(),
    isActive: input.isActive,
    modulePermissions: resolvedPermissions
  };

  if (input.role) {
    const roleRecord = await prisma.role.findUnique({
      where: { code: toRoleCode(input.role) },
      select: { id: true }
    });
    if (!roleRecord) {
      return jsonError("Role not configured", 500);
    }
    updateData.role = { connect: { id: roleRecord.id } };
  }

  let generatedTemporaryPassword: string | null = null;
  if (input.passwordAction === "set" && input.password) {
    updateData.passwordHash = hashPassword(input.password);
    updateData.mustChangePassword = false;
    updateData.passwordUpdatedAt = new Date();
    updateData.tempPasswordIssuedAt = null;
  } else if (input.passwordAction === "generate") {
    generatedTemporaryPassword = generateTemporaryPassword();
    updateData.passwordHash = hashPassword(generatedTemporaryPassword);
    updateData.mustChangePassword = true;
    updateData.passwordUpdatedAt = new Date();
    updateData.tempPasswordIssuedAt = new Date();
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true }
    });
    const passwordForEmail = generatedTemporaryPassword ?? input.password ?? null;
    const passwordResetEmail =
      input.passwordAction !== "none" && passwordForEmail
        ? await sendPasswordResetEmail(updatedUser.email, updatedUser.fullName, passwordForEmail)
        : null;

    return NextResponse.json({
      success: true,
      user: toManagedUserResponse(updatedUser),
      generatedTemporaryPassword,
      passwordResetEmail
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("A user with this email already exists.", 409);
    }

    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireSuperAdminRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  if (id === auth.user.id) {
    return jsonError("You cannot delete your own account.", 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true }
  });
  if (!existingUser) {
    return jsonError("User not found", 404);
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

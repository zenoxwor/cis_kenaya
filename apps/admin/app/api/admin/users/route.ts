import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { APP_ROLES, isAppRole } from "@/lib/rbac/roles";
import { requireSuperAdminRequestUser } from "@/lib/auth/api-authorization";
import {
  ensureSystemRoles,
  resolveDefaultCampusId,
  defaultPermissionsForRole,
  normalizePermissionsForRole,
  hashPassword,
  generateTemporaryPassword,
  toManagedUserResponse,
  toRoleCode
} from "@/lib/admin/user-management";
import { sendWelcomeEmail } from "@/lib/email/resend";

const createUserSchema = z
  .object({
    email: z.string().trim().email(),
    fullName: z.string().trim().min(2).max(120),
    role: z.enum(APP_ROLES),
    modulePermissions: z.array(z.string()).optional(),
    passwordMode: z.enum(["set", "generate"]).default("generate"),
    password: z.string().min(8).max(200).optional(),
    isActive: z.boolean().default(true)
  })
  .superRefine((value, ctx) => {
    if (value.passwordMode === "set" && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password is required when passwordMode is set",
        path: ["password"]
      });
    }
  });

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function toCreatePasswordResult(input: z.infer<typeof createUserSchema>) {
  if (input.passwordMode === "set" && input.password) {
    return {
      passwordHash: hashPassword(input.password),
      mustChangePassword: false,
      tempPasswordIssuedAt: null as Date | null,
      generatedTemporaryPassword: null as string | null
    };
  }

  const generatedTemporaryPassword = generateTemporaryPassword();
  return {
    passwordHash: hashPassword(generatedTemporaryPassword),
    mustChangePassword: true,
    tempPasswordIssuedAt: new Date(),
    generatedTemporaryPassword
  };
}

export async function GET(request: NextRequest) {
  const auth = requireSuperAdminRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  await ensureSystemRoles(prisma);
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: [{ createdAt: "desc" }]
  });

  return NextResponse.json({
    success: true,
    users: users.map(toManagedUserResponse)
  });
}

export async function POST(request: NextRequest) {
  const auth = requireSuperAdminRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }

  const input = parsed.data;
  if (!isAppRole(input.role)) {
    return jsonError("Invalid role", 400);
  }

  const role = input.role;
  const modulePermissions = input.modulePermissions
    ? normalizePermissionsForRole(role, input.modulePermissions)
    : defaultPermissionsForRole(role);
  const passwordResult = toCreatePasswordResult(input);

  try {
    await ensureSystemRoles(prisma);
    const campusId = await resolveDefaultCampusId(prisma);
    const roleRecord = await prisma.role.findUnique({
      where: { code: toRoleCode(role) },
      select: { id: true }
    });
    if (!roleRecord) {
      return jsonError("Role not configured", 500);
    }

    const createdUser = await prisma.user.create({
      data: {
        campusId,
        roleId: roleRecord.id,
        email: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        isActive: input.isActive,
        modulePermissions,
        passwordHash: passwordResult.passwordHash,
        mustChangePassword: passwordResult.mustChangePassword,
        tempPasswordIssuedAt: passwordResult.tempPasswordIssuedAt,
        passwordUpdatedAt: new Date()
      },
      include: { role: true }
    });
    const passwordForEmail = passwordResult.generatedTemporaryPassword ?? input.password;
    const welcomeEmail = passwordForEmail
      ? await sendWelcomeEmail(
          createdUser.email,
          createdUser.fullName,
          createdUser.email,
          passwordForEmail
        )
      : null;

    return NextResponse.json({
      success: true,
      user: toManagedUserResponse(createdUser),
      generatedTemporaryPassword: passwordResult.generatedTemporaryPassword,
      welcomeEmail
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("A user with this email already exists.", 409);
    }

    throw error;
  }
}

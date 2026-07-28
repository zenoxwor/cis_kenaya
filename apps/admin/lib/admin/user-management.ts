import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { AppRole } from "@/lib/rbac/roles";
import { ROLE } from "@/lib/rbac/roles";
import {
  MODULE_PERMISSIONS,
  normalizePermissions,
  type ModulePermission
} from "@/lib/rbac/module-permissions";
import { AppError } from "@/lib/observability/errors";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";

export const MANAGED_ROLE_OPTIONS = [
  "Principal",
  "Accountant",
  "Teacher",
  "Receptionist",
  "Admin"
] as const;

export type ManagedRoleOption = (typeof MANAGED_ROLE_OPTIONS)[number];

export type ManagedUserRecord = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  permissions: ModulePermission[];
  createdAt: string;
  updatedAt: string;
};

export type CreateManagedUserInput = {
  fullName: string;
  email: string;
  defaultRole: ManagedRoleOption;
  initialPassword: string;
  permissions: ModulePermission[];
};

export type ResetPasswordInstruction =
  | {
      mode: "custom";
      customPassword: string;
    }
  | {
      mode: "generated";
    };

export type UpdateManagedUserInput = {
  fullName?: string;
  email?: string;
  defaultRole?: ManagedRoleOption;
  permissions?: ModulePermission[];
  isActive?: boolean;
  resetPassword?: ResetPasswordInstruction;
};

const SYSTEM_ROLE_SEED: ReadonlyArray<{ code: AppRole; name: string; description: string }> = [
  { code: ROLE.SUPER_ADMIN, name: "Super Admin", description: "Platform-wide administration and governance." },
  { code: ROLE.PRINCIPAL, name: "Principal", description: "School leadership role." },
  { code: ROLE.RECEPTION, name: "Reception", description: "Reception and admissions operations." },
  { code: ROLE.FINANCE, name: "Finance", description: "Financial operations role." },
  { code: ROLE.TEACHER, name: "Teacher", description: "Instructional role." }
];

function mapManagedRoleToAppRole(value: ManagedRoleOption): AppRole {
  switch (value) {
    case "Principal":
      return ROLE.PRINCIPAL;
    case "Accountant":
      return ROLE.FINANCE;
    case "Teacher":
      return ROLE.TEACHER;
    case "Receptionist":
      return ROLE.RECEPTION;
    case "Admin":
      return ROLE.SUPER_ADMIN;
    default:
      return ROLE.PRINCIPAL;
  }
}

async function ensureSystemRoles() {
  await Promise.all(
    SYSTEM_ROLE_SEED.map(role =>
      prisma.role.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
          isSystem: true
        },
        create: {
          code: role.code,
          name: role.name,
          description: role.description,
          isSystem: true
        }
      })
    )
  );
}

async function resolvePrimaryCampusId() {
  const existing = await prisma.campus.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.campus.create({
    data: {
      code: "MAIN",
      name: "Main Campus",
      isMain: true,
      timezone: "Africa/Nairobi",
      locale: "en-KE"
    },
    select: { id: true }
  });

  return created.id;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapUserRecord(record: {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  role: { code: AppRole };
}): ManagedUserRecord {
  return {
    id: record.id,
    fullName: record.fullName,
    email: record.email,
    role: record.role.code,
    isActive: record.isActive,
    permissions: normalizePermissions(record.role.code, record.permissions),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function mapPrismaError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new AppError("A user with this email already exists.", {
      code: "CONFLICT",
      statusCode: 409
    });
  }
}

export async function listManagedUsers() {
  const records = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          code: true
        }
      }
    }
  });

  return records.map(mapUserRecord);
}

export async function createManagedUser(input: CreateManagedUserInput) {
  await ensureSystemRoles();
  const campusId = await resolvePrimaryCampusId();
  const roleCode = mapManagedRoleToAppRole(input.defaultRole);
  const role = await prisma.role.findUnique({
    where: { code: roleCode },
    select: { id: true }
  });

  if (!role) {
    throw new AppError("Default role is not configured.", {
      code: "VALIDATION_ERROR",
      statusCode: 400
    });
  }

  try {
    const record = await prisma.user.create({
      data: {
        campusId,
        roleId: role.id,
        fullName: input.fullName.trim(),
        email: normalizeEmail(input.email),
        passwordHash: hashPassword(input.initialPassword),
        isActive: true,
        permissions: normalizePermissions(roleCode, input.permissions)
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            code: true
          }
        }
      }
    });

    return mapUserRecord(record);
  } catch (error) {
    mapPrismaError(error);
    throw error;
  }
}

export async function updateManagedUser(
  id: string,
  input: UpdateManagedUserInput
) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: {
        select: {
          code: true
        }
      }
    }
  });

  if (!existing) {
    throw new AppError("User not found.", { code: "NOT_FOUND", statusCode: 404 });
  }

  let roleId: string | undefined;
  let nextRoleCode: AppRole = existing.role.code;
  if (input.defaultRole) {
    nextRoleCode = mapManagedRoleToAppRole(input.defaultRole);
    const role = await prisma.role.findUnique({
      where: { code: nextRoleCode },
      select: { id: true }
    });
    if (!role) {
      throw new AppError("Selected role is not configured.", {
        code: "VALIDATION_ERROR",
        statusCode: 400
      });
    }
    roleId = role.id;
  }

  let temporaryPassword: string | null = null;
  let passwordHash: string | undefined;
  if (input.resetPassword?.mode === "custom") {
    passwordHash = hashPassword(input.resetPassword.customPassword);
  } else if (input.resetPassword?.mode === "generated") {
    temporaryPassword = generateTemporaryPassword();
    passwordHash = hashPassword(temporaryPassword);
  }

  const permissions =
    input.permissions === undefined
      ? undefined
      : normalizePermissions(nextRoleCode, input.permissions);

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName?.trim(),
        email: input.email ? normalizeEmail(input.email) : undefined,
        roleId,
        permissions,
        isActive: input.isActive,
        passwordHash
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            code: true
          }
        }
      }
    });

    return {
      user: mapUserRecord(updated),
      temporaryPassword
    };
  } catch (error) {
    mapPrismaError(error);
    throw error;
  }
}

export async function deleteManagedUser(id: string) {
  try {
    await prisma.user.delete({
      where: { id }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("User not found.", { code: "NOT_FOUND", statusCode: 404 });
    }
    throw error;
  }
}

export { MODULE_PERMISSIONS };


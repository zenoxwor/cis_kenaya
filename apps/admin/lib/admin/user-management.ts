import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { RoleCode, type User, type Role } from "@prisma/client";
import { ROLE, type AppRole } from "@/lib/rbac/roles";
import type { ModulePermissionKey } from "@/lib/admin/module-permissions";
import {
  DEFAULT_ROLE_MODULE_PERMISSIONS,
  normalizeModulePermissions
} from "@/lib/admin/module-permissions";
import type { SessionUser } from "@/lib/auth/types";

const ROLE_METADATA: Record<
  RoleCode,
  {
    name: string;
    description: string;
  }
> = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "System-wide governance and oversight permissions."
  },
  PRINCIPAL: {
    name: "Principal",
    description: "School leadership and approvals."
  },
  RECEPTION: {
    name: "Reception",
    description: "Admissions and front-office operations."
  },
  FINANCE: {
    name: "Finance",
    description: "Finance operations and reporting."
  },
  TEACHER: {
    name: "Teacher",
    description: "Teaching and class-level academic workflows."
  }
};

export type ManagedUserRecord = User & {
  role: Role;
};

export type ManagedUserResponse = {
  id: string;
  email: string;
  fullName: string;
  teachingSubject: string | null;
  role: AppRole;
  isActive: boolean;
  modulePermissions: ModulePermissionKey[];
  mustChangePassword: boolean;
  tempPasswordIssuedAt: string | null;
  passwordUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toAppRole(roleCode: RoleCode): AppRole {
  return roleCode;
}

export function toRoleCode(role: AppRole): RoleCode {
  return role;
}

export function normalizePermissionsForRole(
  role: AppRole,
  permissions: string[] | undefined
): ModulePermissionKey[] {
  return normalizeModulePermissions(permissions, role);
}

export function hashPassword(rawPassword: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(rawPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(rawPassword: string, storedPasswordHash: string | null | undefined) {
  if (!storedPasswordHash) {
    return false;
  }

  const [algorithm, salt, expectedHash] = storedPasswordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const computedHash = scryptSync(rawPassword, salt, 64).toString("hex");
  const expectedHashBuffer = Buffer.from(expectedHash, "hex");
  const computedHashBuffer = Buffer.from(computedHash, "hex");

  return (
    expectedHashBuffer.length === computedHashBuffer.length &&
    timingSafeEqual(computedHashBuffer, expectedHashBuffer)
  );
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(18);
  let password = "";
  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }
  return password;
}

type AdminPrismaClient = {
  role: {
    upsert: (...args: any[]) => Promise<any>;
  };
  campus: {
    upsert: (...args: any[]) => Promise<{ id: string }>;
  };
};

export async function ensureSystemRoles(prisma: AdminPrismaClient) {
  await Promise.all(
    (Object.keys(ROLE_METADATA) as RoleCode[]).map(roleCode =>
      prisma.role.upsert({
        where: { code: roleCode },
        update: {
          name: ROLE_METADATA[roleCode].name,
          description: ROLE_METADATA[roleCode].description,
          isSystem: true
        },
        create: {
          code: roleCode,
          name: ROLE_METADATA[roleCode].name,
          description: ROLE_METADATA[roleCode].description,
          isSystem: true
        }
      })
    )
  );
}

export async function resolveDefaultCampusId(prisma: AdminPrismaClient) {
  const mainCampus = await prisma.campus.upsert({
    where: { code: "MAIN" },
    update: {
      name: "Main Campus",
      isMain: true
    },
    create: {
      code: "MAIN",
      name: "Main Campus",
      isMain: true,
      timezone: "Africa/Nairobi",
      locale: "en-KE"
    },
    select: { id: true }
  });

  return mainCampus.id;
}

export function toManagedUserResponse(user: ManagedUserRecord): ManagedUserResponse {
  const role = toAppRole(user.role.code);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    teachingSubject: user.teachingSubject,
    role,
    isActive: user.isActive,
    modulePermissions: normalizePermissionsForRole(role, user.modulePermissions),
    mustChangePassword: user.mustChangePassword,
    tempPasswordIssuedAt: user.tempPasswordIssuedAt?.toISOString() ?? null,
    passwordUpdatedAt: user.passwordUpdatedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export function toSessionUser(user: ManagedUserRecord): SessionUser {
  const role = toAppRole(user.role.code);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    isActive: user.isActive,
    modulePermissions: normalizePermissionsForRole(role, user.modulePermissions)
  };
}

export function defaultPermissionsForRole(role: AppRole) {
  return [...DEFAULT_ROLE_MODULE_PERMISSIONS[role]];
}

export function isRoleEscalationForbidden(actorRole: AppRole, targetRole: AppRole) {
  return actorRole !== ROLE.SUPER_ADMIN && targetRole === ROLE.SUPER_ADMIN;
}

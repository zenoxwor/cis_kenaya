import { ROLE, type AppRole } from "@/lib/rbac/roles";

export const MODULE_PERMISSIONS = [
  "executive_analytics",
  "backup_recovery",
  "super_admin_console",
  "principal_dashboard",
  "staff_accounts",
  "reception_admissions",
  "finance_ops",
  "registration_wizard",
  "exams_grading",
  "communications_centre",
  "document_center",
  "attendance"
] as const;

export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

const MODULE_PERMISSION_SET = new Set<string>(MODULE_PERMISSIONS);

const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, ModulePermission[]> = {
  [ROLE.SUPER_ADMIN]: [...MODULE_PERMISSIONS],
  [ROLE.PRINCIPAL]: [
    "executive_analytics",
    "backup_recovery",
    "principal_dashboard",
    "staff_accounts",
    "reception_admissions",
    "registration_wizard",
    "exams_grading",
    "communications_centre",
    "document_center",
    "attendance"
  ],
  [ROLE.RECEPTION]: [
    "executive_analytics",
    "reception_admissions",
    "registration_wizard",
    "exams_grading",
    "communications_centre",
    "document_center",
    "attendance"
  ],
  [ROLE.FINANCE]: ["executive_analytics", "finance_ops", "communications_centre"],
  [ROLE.TEACHER]: ["exams_grading", "attendance"]
};

const ROUTE_PERMISSION_MAP: ReadonlyArray<{
  prefix: string;
  module: ModulePermission;
}> = [
  { prefix: "/admin/principal/staff-accounts", module: "staff_accounts" },
  { prefix: "/admin/super-admin", module: "super_admin_console" },
  { prefix: "/admin/principal", module: "principal_dashboard" },
  { prefix: "/admin/admissions", module: "reception_admissions" },
  { prefix: "/admin/reception", module: "reception_admissions" },
  { prefix: "/admin/finance", module: "finance_ops" },
  { prefix: "/admin/registration", module: "registration_wizard" },
  { prefix: "/admin/exams", module: "exams_grading" },
  { prefix: "/admin/communications", module: "communications_centre" },
  { prefix: "/admin/documents", module: "document_center" },
  { prefix: "/admin/attendance", module: "attendance" },
  { prefix: "/admin/operations", module: "backup_recovery" },
  { prefix: "/admin/analytics", module: "executive_analytics" }
];

export function isModulePermission(value: string): value is ModulePermission {
  return MODULE_PERMISSION_SET.has(value);
}

export function getDefaultPermissionsForRole(role: AppRole): ModulePermission[] {
  return [...DEFAULT_ROLE_PERMISSIONS[role]];
}

export function normalizePermissions(
  role: AppRole,
  rawPermissions: unknown
): ModulePermission[] {
  if (!Array.isArray(rawPermissions)) {
    return getDefaultPermissionsForRole(role);
  }

  const permissions = rawPermissions.filter(
    permission => typeof permission === "string" && isModulePermission(permission)
  ) as ModulePermission[];

  return Array.from(new Set(permissions));
}

export function hasPermission(
  user: {
    permissions: ModulePermission[];
  },
  moduleName: ModulePermission
) {
  return user.permissions.includes(moduleName);
}

export function getModulePermissionForRoute(route: string): ModulePermission | null {
  for (const mapping of ROUTE_PERMISSION_MAP) {
    if (route === mapping.prefix || route.startsWith(`${mapping.prefix}/`)) {
      return mapping.module;
    }
  }

  return null;
}


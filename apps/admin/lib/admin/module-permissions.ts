import { ROLE, type AppRole } from "@/lib/rbac/roles";

export const MODULE_PERMISSION_KEYS = [
  "executive_analytics",
  "backup_recovery",
  "super_admin_console",
  "user_governance",
  "principal_dashboard",
  "reception_admissions",
  "finance_ops",
  "registration_wizard",
  "exams_grading",
  "communications_centre",
  "document_center",
  "attendance"
] as const;

export type ModulePermissionKey = (typeof MODULE_PERMISSION_KEYS)[number];

export const MODULE_PERMISSION_LABELS: Record<ModulePermissionKey, string> = {
  executive_analytics: "Executive Analytics",
  backup_recovery: "Backup & Recovery",
  super_admin_console: "Super Admin Console",
  user_governance: "User & Role Governance",
  principal_dashboard: "Principal Dashboard",
  reception_admissions: "Reception / Admissions",
  finance_ops: "Finance Ops",
  registration_wizard: "Registration Wizard",
  exams_grading: "Exams & Grading",
  communications_centre: "Communications Centre",
  document_center: "Document Center",
  attendance: "Attendance"
};

export const MODULE_PERMISSION_DESCRIPTIONS: Record<ModulePermissionKey, string> = {
  executive_analytics: "View cross-module strategic analytics.",
  backup_recovery: "Access backup status and recovery actions.",
  super_admin_console: "Manage system-wide admin governance controls.",
  user_governance: "Manage admin user identities, roles, and module-level permissions.",
  principal_dashboard: "Access principal oversight dashboards and reports.",
  reception_admissions: "Manage admissions and reception workflows.",
  finance_ops: "Handle finance operations, invoices, and payments.",
  registration_wizard: "Use the student registration wizard.",
  exams_grading: "Manage exams, marks, and report cards.",
  communications_centre: "Send and manage parent communications.",
  document_center: "Manage student document verification lifecycle.",
  attendance: "Capture and manage attendance records."
};

export const DEFAULT_ROLE_MODULE_PERMISSIONS: Record<AppRole, ModulePermissionKey[]> = {
  [ROLE.SUPER_ADMIN]: [...MODULE_PERMISSION_KEYS],
  [ROLE.PRINCIPAL]: [
    "executive_analytics",
    "backup_recovery",
    "principal_dashboard",
    "reception_admissions",
    "registration_wizard",
    "exams_grading",
    "communications_centre",
    "document_center",
    "attendance",
    "finance_ops"
  ],
  [ROLE.RECEPTION]: [
    "executive_analytics",
    "reception_admissions",
    "registration_wizard",
    "communications_centre",
    "document_center",
    "attendance"
  ],
  [ROLE.FINANCE]: ["executive_analytics", "finance_ops", "communications_centre"],
  [ROLE.TEACHER]: ["exams_grading", "attendance"]
};

const ADMIN_ROUTE_PERMISSION_PREFIXES: Array<{
  prefix: string;
  permission: ModulePermissionKey;
}> = [
  { prefix: "/admin/analytics", permission: "executive_analytics" },
  { prefix: "/admin/operations", permission: "backup_recovery" },
  { prefix: "/admin/super-admin/users", permission: "user_governance" },
  { prefix: "/admin/super-admin", permission: "super_admin_console" },
  { prefix: "/admin/principal", permission: "principal_dashboard" },
  { prefix: "/admin/admissions", permission: "reception_admissions" },
  { prefix: "/admin/reception", permission: "reception_admissions" },
  { prefix: "/admin/finance", permission: "finance_ops" },
  { prefix: "/admin/registration", permission: "registration_wizard" },
  { prefix: "/admin/exams", permission: "exams_grading" },
  { prefix: "/admin/communications", permission: "communications_centre" },
  { prefix: "/admin/documents", permission: "document_center" },
  { prefix: "/admin/attendance", permission: "attendance" }
];

export function isModulePermissionKey(value: string): value is ModulePermissionKey {
  return MODULE_PERMISSION_KEYS.includes(value as ModulePermissionKey);
}

export function normalizeModulePermissions(
  permissions: string[] | undefined,
  role: AppRole
): ModulePermissionKey[] {
  const defaults = DEFAULT_ROLE_MODULE_PERMISSIONS[role];
  if (!permissions || permissions.length === 0) {
    return defaults;
  }

  const normalized = permissions.filter(isModulePermissionKey);
  if (normalized.length === 0) {
    return defaults;
  }

  return Array.from(new Set(normalized));
}

export function getRoutePermissionKey(route: string): ModulePermissionKey | null {
  const normalizedRoute = route.endsWith("/") && route !== "/" ? route.slice(0, -1) : route;
  if (normalizedRoute === "/admin") {
    return null;
  }

  const match = ADMIN_ROUTE_PERMISSION_PREFIXES.find(({ prefix }) =>
    normalizedRoute === prefix || normalizedRoute.startsWith(`${prefix}/`)
  );
  return match?.permission ?? null;
}

export function hasModulePermission(
  permissions: string[] | undefined,
  role: AppRole,
  permission: ModulePermissionKey
) {
  const normalized = normalizeModulePermissions(permissions, role);
  return normalized.includes(permission);
}

export function hasAnyModulePermission(permissions: string[] | undefined, role: AppRole) {
  return normalizeModulePermissions(permissions, role).length > 0;
}

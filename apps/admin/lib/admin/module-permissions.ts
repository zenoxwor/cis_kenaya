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
  executive_analytics: "Executive & Cross-Module Analytics",
  backup_recovery: "Operations, Backup & Recovery",
  super_admin_console: "Super Admin Configuration",
  user_governance: "User & Role Governance",
  principal_dashboard: "Principal Dashboard & Timetable Workflow",
  reception_admissions: "Reception, Visitors & Appointments",
  finance_ops: "Finance & Billing Operations",
  registration_wizard: "Registration & Enrollment Wizard",
  exams_grading: "Exams, Grading & Academic Records",
  communications_centre: "Communications Centre",
  document_center: "Student Document Center",
  attendance: "Attendance, Staff Check-In & Incidents"
};

export const MODULE_PERMISSION_DESCRIPTIONS: Record<ModulePermissionKey, string> = {
  executive_analytics: "Review strategic insights across admissions, academics, finance, attendance, and operations.",
  backup_recovery: "Monitor system operations plus backup and recovery actions.",
  super_admin_console: "Configure platform-wide settings and sensitive admin controls.",
  user_governance:
    "Manage staff accounts, role assignments, and module-level access for active portal workflows.",
  principal_dashboard:
    "Access principal oversight views, timetable visibility, and school-level decision dashboards.",
  reception_admissions:
    "Run reception workflows including admissions, visitor logging, and appointment coordination.",
  finance_ops: "Manage invoices, collections, and finance operations.",
  registration_wizard: "Handle learner onboarding from registration through enrollment steps.",
  exams_grading: "Manage assessments, grading, and report card outputs.",
  communications_centre: "Coordinate parent/staff communication campaigns and delivery tracking.",
  document_center: "Manage document verification, reminders, and compliance tracking.",
  attendance: "Track learner attendance, staff attendance, and incident-linked attendance follow-up."
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
    "attendance"
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

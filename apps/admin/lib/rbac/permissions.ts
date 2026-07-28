import type { AppRole } from "@/lib/rbac/roles";
import { ROLE } from "@/lib/rbac/roles";
import {
  getRoutePermissionKey,
  hasAnyModulePermission,
  hasModulePermission,
  type ModulePermissionKey
} from "@/lib/admin/module-permissions";

export const ACTION_PERMISSIONS = [
  "view",
  "create",
  "edit",
  "approve",
  "export",
  "override"
] as const;

export type ActionPermission = (typeof ACTION_PERMISSIONS)[number];

export const DOMAIN_RESOURCES = [
  "dashboard",
  "user",
  "student",
  "guardian",
  "application",
  "enrollment",
  "student_document",
  "fee_invoice",
  "payment",
  "exam_term",
  "exam_component",
  "student_mark",
  "report_card",
  "staff_account",
  "visitor_log",
  "audit_log",
  "settings",
  "report",
  "communication",
  "message_template",
  "attendance_record",
  "attendance_correction",
  "finance_automation",
  "backup_recovery"
] as const;

export type DomainResource = (typeof DOMAIN_RESOURCES)[number];

export const ADMIN_ROUTE_KEYS = [
  "/admin",
  "/admin/analytics",
  "/admin/operations",
  "/admin/super-admin",
  "/admin/super-admin/users",
  "/admin/super-admin/audit",
  "/admin/super-admin/settings",
  "/admin/principal",
  "/admin/principal/reports",
  "/admin/principal/analytics",
  "/admin/admissions",
  "/admin/reception",
  "/admin/reception/applications",
  "/admin/reception/analytics",
  "/admin/reception/check-in",
  "/admin/reception/incidents",
  "/admin/reception/visitors",
  "/admin/reception/early-pickup",
  "/admin/reception/appointments",
  "/admin/reception/lost-found",
  "/admin/reception/documents",
  "/admin/reception/pre-registrations",
  "/admin/registration",
  "/admin/finance",
  "/admin/finance/invoices",
  "/admin/finance/payments",
  "/admin/finance/reports",
  "/admin/exams",
  "/admin/exams/marks",
  "/admin/exams/reports",
  "/admin/communications",
  "/admin/communications/compose",
  "/admin/communications/templates",
  "/admin/communications/history",
  "/admin/communications/settings",
  "/admin/documents",
  "/admin/attendance",
  "/admin/attendance/reports",
  "/admin/principal/classes"
] as const;

export type AdminRouteKey = (typeof ADMIN_ROUTE_KEYS)[number];

export const ADMIN_NAV_KEYS = [
  "dashboard",
  "executive_analytics",
  "operations_resilience",
  "super_admin_console",
  "principal_dashboard",
  "reception_dashboard",
  "reception_pre_registrations",
  "registration_wizard",
  "finance_dashboard",
  "exams_suite",
  "communications_center",
  "documents_center",
  "attendance_module",
  "classes_management"
] as const;

export type AdminNavKey = (typeof ADMIN_NAV_KEYS)[number];

const NAV_PERMISSION_KEYS: Partial<Record<AdminNavKey, ModulePermissionKey>> = {
  executive_analytics: "executive_analytics",
  operations_resilience: "backup_recovery",
  super_admin_console: "super_admin_console",
  principal_dashboard: "principal_dashboard",
  reception_dashboard: "reception_admissions",
  reception_pre_registrations: "reception_admissions",
  registration_wizard: "registration_wizard",
  finance_dashboard: "finance_ops",
  exams_suite: "exams_grading",
  communications_center: "communications_centre",
  documents_center: "document_center",
  attendance_module: "attendance",
  classes_management: "principal_dashboard"
};

export type RolePermissionMatrix = {
  routeAccess: AdminRouteKey[];
  navigationVisibility: AdminNavKey[];
  actions: Partial<Record<DomainResource, ActionPermission[]>>;
};

export const ROLE_PERMISSION_MATRIX: Record<AppRole, RolePermissionMatrix> = {
  [ROLE.SUPER_ADMIN]: {
    routeAccess: [...ADMIN_ROUTE_KEYS],
    navigationVisibility: [...ADMIN_NAV_KEYS],
    actions: {
      dashboard: ["view", "override"],
      user: ["view", "create", "edit", "approve", "override"],
      student: ["view", "create", "edit", "approve", "export", "override"],
      guardian: ["view", "create", "edit", "approve", "export", "override"],
      application: ["view", "create", "edit", "approve", "export", "override"],
      enrollment: ["view", "create", "edit", "approve", "export", "override"],
      student_document: ["view", "create", "edit", "approve", "export", "override"],
      fee_invoice: ["view", "create", "edit", "approve", "export", "override"],
      payment: ["view", "create", "edit", "approve", "export", "override"],
      exam_term: ["view", "create", "edit", "approve", "override"],
      exam_component: ["view", "create", "edit", "approve", "override"],
      student_mark: ["view", "create", "edit", "approve", "export", "override"],
      report_card: ["view", "create", "edit", "approve", "export", "override"],
      staff_account: ["view", "create", "edit", "approve", "export", "override"],
      visitor_log: ["view", "create", "edit", "export", "override"],
      audit_log: ["view", "export", "override"],
      settings: ["view", "edit", "approve", "override"],
      report: ["view", "export", "override"],
      communication: ["view", "create", "edit", "approve", "export", "override"],
      message_template: ["view", "create", "edit", "approve", "override"],
      attendance_record: ["view", "create", "edit", "approve", "export", "override"],
      attendance_correction: ["view", "create", "edit", "approve", "override"],
      finance_automation: ["view", "create", "edit", "approve", "export", "override"],
      backup_recovery: ["view", "create", "edit", "approve", "export", "override"]
    }
  },
  [ROLE.PRINCIPAL]: {
    // Full access to core operational modules, excluding Settings and Finance controls.
    routeAccess: [
      "/admin",
      "/admin/analytics",
      "/admin/operations",
      "/admin/principal",
      "/admin/principal/reports",
      "/admin/principal/analytics",
      "/admin/admissions",
      "/admin/reception",
      "/admin/reception/applications",
      "/admin/reception/analytics",
      "/admin/reception/check-in",
      "/admin/reception/incidents",
      "/admin/reception/visitors",
      "/admin/reception/early-pickup",
      "/admin/reception/appointments",
      "/admin/reception/lost-found",
      "/admin/reception/documents",
      "/admin/reception/pre-registrations",
      "/admin/registration",
      "/admin/exams",
      "/admin/exams/marks",
      "/admin/exams/reports",
      "/admin/communications",
      "/admin/communications/compose",
      "/admin/communications/history",
      "/admin/communications/templates",
      "/admin/communications/settings",
      "/admin/documents",
      "/admin/attendance",
      "/admin/attendance/reports",
      "/admin/principal/classes"
    ],
    navigationVisibility: [
      "dashboard",
      "executive_analytics",
      "operations_resilience",
      "principal_dashboard",
      "reception_dashboard",
      "reception_pre_registrations",
      "registration_wizard",
      "exams_suite",
      "communications_center",
      "documents_center",
      "attendance_module",
      "classes_management"
    ],
    actions: {
      dashboard: ["view"],
      user: ["view"],                                                   // read-only; no create/override
      staff_account: ["view", "create", "edit"],
      student: ["view", "create", "edit", "approve", "export"],
      guardian: ["view", "create", "edit", "export"],
      application: ["view", "create", "edit", "approve", "export"],
      enrollment: ["view", "create", "edit", "approve", "export"],
      student_document: ["view", "approve", "export"],
      exam_term: ["view", "create", "edit", "approve"],
      exam_component: ["view", "create", "edit", "approve"],
      student_mark: ["view", "approve", "export"],
      report_card: ["view", "approve", "export"],
      visitor_log: ["view", "export"],
      audit_log: ["view"],
      report: ["view", "export"],
      communication: ["view", "create", "edit", "export"],
      message_template: ["view", "create", "edit", "approve"],
      attendance_record: ["view", "create", "edit", "approve", "export"],
      attendance_correction: ["view", "approve"],
      backup_recovery: ["view"]
      // `settings` resource intentionally omitted — Super Admin only
    }
  },
  [ROLE.RECEPTION]: {
    routeAccess: [
      "/admin",
      "/admin/analytics",
      "/admin/admissions",
      "/admin/reception",
      "/admin/reception/applications",
      "/admin/reception/analytics",
      "/admin/reception/check-in",
      "/admin/reception/incidents",
      "/admin/reception/visitors",
      "/admin/reception/early-pickup",
      "/admin/reception/appointments",
      "/admin/reception/lost-found",
      "/admin/reception/documents",
      "/admin/reception/pre-registrations",
      "/admin/registration",
      "/admin/exams",
      "/admin/exams/marks",
      "/admin/exams/reports",
      "/admin/communications",
      "/admin/communications/compose",
      "/admin/communications/history",
      "/admin/documents",
      "/admin/attendance",
      "/admin/attendance/reports"
    ],
    navigationVisibility: [
      "dashboard",
      "executive_analytics",
      "reception_dashboard",
      "reception_pre_registrations",
      "registration_wizard",
      "exams_suite",
      "communications_center",
      "documents_center",
      "attendance_module"
    ],
    actions: {
      dashboard: ["view"],
      student: ["view", "create", "edit"],
      guardian: ["view", "create", "edit"],
      application: ["view", "create", "edit", "approve"],
      enrollment: ["view", "create", "edit"],
      student_document: ["view", "create", "edit"],
      exam_term: ["view"],
      exam_component: ["view"],
      student_mark: ["view", "create", "edit", "export"],
      report_card: ["view"],
      visitor_log: ["view", "create", "edit"],
      report: ["view", "export"],
      communication: ["view", "create"],
      attendance_record: ["view", "create", "edit"],
      attendance_correction: ["view", "create"]
    }
  },
  [ROLE.FINANCE]: {
    routeAccess: [
      "/admin",
      "/admin/analytics",
      "/admin/finance",
      "/admin/finance/invoices",
      "/admin/finance/payments",
      "/admin/finance/reports",
      "/admin/communications",
      "/admin/communications/compose",
      "/admin/communications/history"
    ],
    navigationVisibility: [
      "dashboard",
      "executive_analytics",
      "finance_dashboard",
      "communications_center"
    ],
    actions: {
      dashboard: ["view"],
      fee_invoice: ["view", "create", "edit", "approve", "export"],
      payment: ["view", "create", "edit", "approve", "export", "override"],
      student: ["view", "export"],
      guardian: ["view", "export"],
      report: ["view", "export"],
      audit_log: ["view"],
      communication: ["view", "create"],
      finance_automation: ["view", "create", "edit", "approve", "export"]
    }
  },
  [ROLE.TEACHER]: {
    routeAccess: [
      "/admin",
      "/admin/exams",
      "/admin/exams/marks",
      "/admin/exams/reports",
      "/admin/attendance",
      "/admin/attendance/reports"
    ],
    navigationVisibility: ["dashboard", "exams_suite", "attendance_module"],
    actions: {
      dashboard: ["view"],
      student: ["view"],
      exam_term: ["view"],
      exam_component: ["view"],
      student_mark: ["view", "create", "edit"],
      report_card: ["view", "export"],
      attendance_record: ["view", "create", "edit"],
      attendance_correction: ["view", "create"]
    }
  }
};

export function canAccessRoute(role: AppRole, route: string, modulePermissions?: string[]) {
  const canAccessByRole = ROLE_PERMISSION_MATRIX[role].routeAccess.some(allowedRoute => {
    if (allowedRoute === "/admin") {
      return route === "/admin" || route === "/admin/";
    }

    return route === allowedRoute || route.startsWith(`${allowedRoute}/`);
  });
  if (!canAccessByRole) {
    return false;
  }

  const requiredPermission = getRoutePermissionKey(route);
  if (!requiredPermission) {
    return hasAnyModulePermission(modulePermissions, role);
  }

  return hasModulePermission(modulePermissions, role, requiredPermission);
}

export function canViewNavigation(role: AppRole, navKey: AdminNavKey, modulePermissions?: string[]) {
  if (!ROLE_PERMISSION_MATRIX[role].navigationVisibility.includes(navKey)) {
    return false;
  }

  const requiredPermission = NAV_PERMISSION_KEYS[navKey];
  if (!requiredPermission) {
    return hasAnyModulePermission(modulePermissions, role);
  }

  return hasModulePermission(modulePermissions, role, requiredPermission);
}

export function canPerformAction(role: AppRole, resource: DomainResource, action: ActionPermission) {
  const resourceActions = ROLE_PERMISSION_MATRIX[role].actions[resource];
  return resourceActions ? resourceActions.includes(action) : false;
}

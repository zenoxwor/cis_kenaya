import type { AppRole } from "@/lib/rbac/roles";
import { ROLE } from "@/lib/rbac/roles";

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
  "visitor_log",
  "audit_log",
  "settings",
  "report"
] as const;

export type DomainResource = (typeof DOMAIN_RESOURCES)[number];

export const ADMIN_ROUTE_KEYS = [
  "/admin",
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
  "/admin/registration",
  "/admin/finance",
  "/admin/finance/invoices",
  "/admin/finance/payments",
  "/admin/finance/reports"
] as const;

export type AdminRouteKey = (typeof ADMIN_ROUTE_KEYS)[number];

export const ADMIN_NAV_KEYS = [
  "dashboard",
  "super_admin_console",
  "principal_dashboard",
  "reception_dashboard",
  "registration_wizard",
  "finance_dashboard"
] as const;

export type AdminNavKey = (typeof ADMIN_NAV_KEYS)[number];

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
      visitor_log: ["view", "create", "edit", "export", "override"],
      audit_log: ["view", "export", "override"],
      settings: ["view", "edit", "approve", "override"],
      report: ["view", "export", "override"]
    }
  },
  [ROLE.PRINCIPAL]: {
    routeAccess: [
      "/admin",
      "/admin/principal",
      "/admin/principal/reports",
      "/admin/principal/analytics",
      "/admin/admissions",
      "/admin/reception",
      "/admin/reception/applications",
      "/admin/reception/analytics",
      "/admin/finance",
      "/admin/finance/invoices",
      "/admin/finance/reports"
    ],
    navigationVisibility: ["dashboard", "principal_dashboard", "reception_dashboard", "finance_dashboard"],
    actions: {
      dashboard: ["view"],
      student: ["view", "approve", "export"],
      guardian: ["view", "export"],
      application: ["view", "approve", "export"],
      enrollment: ["view", "approve", "export"],
      student_document: ["view", "approve", "export"],
      fee_invoice: ["view", "approve", "export"],
      payment: ["view", "export"],
      visitor_log: ["view", "export"],
      audit_log: ["view"],
      report: ["view", "export"]
    }
  },
  [ROLE.RECEPTION]: {
    routeAccess: [
      "/admin",
      "/admin/admissions",
      "/admin/reception",
      "/admin/reception/applications",
      "/admin/reception/analytics",
      "/admin/registration"
    ],
    navigationVisibility: ["dashboard", "reception_dashboard", "registration_wizard"],
    actions: {
      dashboard: ["view"],
      student: ["view", "create", "edit"],
      guardian: ["view", "create", "edit"],
      application: ["view", "create", "edit", "approve"],
      enrollment: ["view", "create", "edit"],
      student_document: ["view", "create", "edit", "approve"],
      visitor_log: ["view", "create", "edit"],
      report: ["view", "export"]
    }
  },
  [ROLE.FINANCE]: {
    routeAccess: [
      "/admin",
      "/admin/finance",
      "/admin/finance/invoices",
      "/admin/finance/payments",
      "/admin/finance/reports"
    ],
    navigationVisibility: ["dashboard", "finance_dashboard"],
    actions: {
      dashboard: ["view"],
      fee_invoice: ["view", "create", "edit", "approve", "export"],
      payment: ["view", "create", "edit", "approve", "export", "override"],
      student: ["view", "export"],
      guardian: ["view", "export"],
      report: ["view", "export"],
      audit_log: ["view"]
    }
  }
};

export function canAccessRoute(role: AppRole, route: string) {
  return ROLE_PERMISSION_MATRIX[role].routeAccess.some(allowedRoute => {
    if (allowedRoute === "/admin") {
      return route === "/admin" || route === "/admin/";
    }

    return route === allowedRoute || route.startsWith(`${allowedRoute}/`);
  });
}

export function canViewNavigation(role: AppRole, navKey: AdminNavKey) {
  return ROLE_PERMISSION_MATRIX[role].navigationVisibility.includes(navKey);
}

export function canPerformAction(role: AppRole, resource: DomainResource, action: ActionPermission) {
  const resourceActions = ROLE_PERMISSION_MATRIX[role].actions[resource];
  return resourceActions ? resourceActions.includes(action) : false;
}

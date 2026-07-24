import type { AppRole } from "@/lib/rbac/roles";

export const APP_PERMISSIONS = [
  "dashboard:read",
  "users:manage",
  "settings:manage",
  "registration:read",
  "registration:manage",
  "registration:wizard",
  "finance:read",
  "finance:manage",
  "reports:read",
  "school:read"
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<AppRole, AppPermission[]> = {
  super_admin: [...APP_PERMISSIONS],
  principal: [
    "dashboard:read",
    "registration:read",
    "reports:read",
    "school:read",
    "finance:read"
  ],
  reception_admissions: [
    "dashboard:read",
    "registration:read",
    "registration:manage",
    "registration:wizard",
    "school:read"
  ],
  finance: ["dashboard:read", "finance:read", "finance:manage", "reports:read", "school:read"]
};

export function hasPermission(role: AppRole, permission: AppPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

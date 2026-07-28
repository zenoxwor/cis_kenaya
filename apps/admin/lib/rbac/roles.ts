export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PRINCIPAL: "PRINCIPAL",
  RECEPTION: "RECEPTION",
  FINANCE: "FINANCE"
} as const;

export type AppRole = (typeof ROLE)[keyof typeof ROLE];

export const APP_ROLES = [ROLE.SUPER_ADMIN, ROLE.PRINCIPAL, ROLE.RECEPTION, ROLE.FINANCE] as const;

export const ROLE_LABELS: Record<AppRole, string> = {
  [ROLE.SUPER_ADMIN]: "Super Admin",
  [ROLE.PRINCIPAL]: "Principal",
  [ROLE.RECEPTION]: "Reception / Admissions",
  [ROLE.FINANCE]: "Finance"
};

export const DEFAULT_APP_ROLE: AppRole = ROLE.SUPER_ADMIN;

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

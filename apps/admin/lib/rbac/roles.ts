export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PRINCIPAL: "PRINCIPAL",
  RECEPTION: "RECEPTION",
  FINANCE: "FINANCE"
} as const;

export type AppRole = (typeof ROLE)[keyof typeof ROLE];

export const APP_ROLES = Object.values(ROLE);

export const ROLE_LABELS: Record<AppRole, string> = {
  [ROLE.SUPER_ADMIN]: "Super Admin",
  [ROLE.PRINCIPAL]: "Principal",
  [ROLE.RECEPTION]: "Reception / Admissions",
  [ROLE.FINANCE]: "Finance"
};

export const DEFAULT_APP_ROLE: AppRole = ROLE.SUPER_ADMIN;

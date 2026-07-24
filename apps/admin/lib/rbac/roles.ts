export const APP_ROLES = [
  "super_admin",
  "principal",
  "reception_admissions",
  "finance"
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  principal: "Principal",
  reception_admissions: "Reception / Admissions",
  finance: "Finance"
};

export const DEFAULT_APP_ROLE: AppRole = "super_admin";

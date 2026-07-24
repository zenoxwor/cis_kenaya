import type { AppPermission } from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/roles";

export type NavigationItem = {
  href: string;
  label: string;
  roles: AppRole[];
  permission?: AppPermission;
};

export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    roles: ["super_admin", "principal", "reception_admissions", "finance"],
    permission: "dashboard:read"
  },
  {
    href: "/admin/super-admin",
    label: "Super Admin Console",
    roles: ["super_admin"],
    permission: "users:manage"
  },
  {
    href: "/admin/principal",
    label: "Principal Dashboard",
    roles: ["super_admin", "principal"],
    permission: "reports:read"
  },
  {
    href: "/admin/admissions",
    label: "Admissions Queue",
    roles: ["super_admin", "reception_admissions", "principal"],
    permission: "registration:read"
  },
  {
    href: "/admin/finance",
    label: "Finance Ops",
    roles: ["super_admin", "finance", "principal"],
    permission: "finance:read"
  },
  {
    href: "/admin/registration",
    label: "6-Step Registration Wizard",
    roles: ["super_admin", "reception_admissions"],
    permission: "registration:wizard"
  }
];

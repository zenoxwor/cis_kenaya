import { canAccessRoute, canViewNavigation, type AdminNavKey } from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/roles";

export type NavigationItem = {
  id: AdminNavKey;
  href: string;
  label: string;
  description: string;
};

export const ADMIN_NAV_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    href: "/admin",
    label: "Dashboard",
    description: "Cross-role overview and quick actions."
  },
  {
    id: "super_admin_console",
    href: "/admin/super-admin",
    label: "Super Admin Console",
    description: "Identity, governance, and global controls."
  },
  {
    id: "principal_dashboard",
    href: "/admin/principal",
    label: "Principal Dashboard",
    description: "School leadership decisions and approvals."
  },
  {
    id: "principal_staff_accounts",
    href: "/admin/principal/staff-accounts",
    label: "Staff Accounts",
    description: "Principal-managed teacher and worker accounts."
  },
  {
    id: "reception_dashboard",
    href: "/admin/reception",
    label: "Reception / Admissions",
    description: "Application pipeline and registration intake."
  },
  {
    id: "finance_dashboard",
    href: "/admin/finance",
    label: "Finance Ops",
    description: "Invoices, collections, and payment operations."
  },
  {
    id: "registration_wizard",
    href: "/admin/registration",
    label: "6-Step Registration Wizard",
    description: "Structured student registration data capture."
  },
  {
    id: "communications_center",
    href: "/admin/communications",
    label: "Communications Centre",
    description: "Send messages to parents and guardians via SMS and email."
  }
];

export function getVisibleNavigation(role: AppRole) {
  return ADMIN_NAV_ITEMS.filter(item => canViewNavigation(role, item.id) && canAccessRoute(role, item.href));
}

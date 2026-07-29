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
    id: "user_governance",
    href: "/admin/super-admin/users",
    label: "User & Role Governance",
    description: "Manage admin identities, module-level permissions, active status, and password resets."
  },
  {
    id: "principal_timetable_management",
    href: "/admin/principal/timetables",
    label: "Timetable Management",
    description: "Create, update, and remove class timetable slots."
  },
  {
    id: "reception_dashboard",
    href: "/admin/reception",
    label: "Reception / Admissions",
    description: "Application pipeline and registration intake."
  },
  {
    id: "reception_pre_registrations",
    href: "/admin/reception/pre-registrations",
    label: "Pre-Registrations",
    description: "Track email verification status for Cambridge intake requests."
  },
  {
    id: "reception_timetables",
    href: "/admin/reception/timetables",
    label: "Class Timetables",
    description: "View and manage class timetable schedules."
  },
  {
    id: "reception_visitors",
    href: "/admin/reception/visitors",
    label: "Visitor Log & Gate Pass",
    description: "Register visitors, print passes, and track gate access."
  },
  {
    id: "reception_incidents",
    href: "/admin/reception/incidents",
    label: "Incidents & Complaints",
    description: "Capture front-desk incidents, inquiries, and complaints."
  },
  {
    id: "reception_appointments",
    href: "/admin/reception/appointments",
    label: "Appointments",
    description: "Coordinate parent, guardian, and school office appointments."
  },
  {
    id: "finance_daily_reports",
    href: "/admin/finance/daily-reports",
    label: "Daily Reports",
    description: "View and download daily reception operation reports for finance review."
  }
];

export function getVisibleNavigation(role: AppRole, modulePermissions?: string[]) {
  return ADMIN_NAV_ITEMS.filter(
    item =>
      canViewNavigation(role, item.id, modulePermissions) &&
      canAccessRoute(role, item.href, modulePermissions)
  );
}

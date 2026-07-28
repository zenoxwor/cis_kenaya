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
    id: "executive_analytics",
    href: "/admin/analytics",
    label: "Executive Analytics",
    description: "Unified trends across enrollment, attendance, finance, exams, and communications."
  },
  {
    id: "operations_resilience",
    href: "/admin/operations",
    label: "Backup & Recovery",
    description: "Monitor backup coverage, restore drills, and recovery readiness."
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
    id: "exams_suite",
    href: "/admin/exams",
    label: "Exams & Grading",
    description: "Kenyan term exams, marks entry, and report cards."
  },
  {
    id: "communications_center",
    href: "/admin/communications",
    label: "Communications Centre",
    description: "Send messages to parents and guardians via SMS and email."
  },
  {
    id: "documents_center",
    href: "/admin/documents",
    label: "Document Center",
    description: "Track uploads, verification lifecycle, and expiry reminders."
  },
  {
    id: "attendance_module",
    href: "/admin/attendance",
    label: "Attendance",
    description: "Track and manage student attendance records."
  }
];

export function getVisibleNavigation(role: AppRole, modulePermissions?: string[]) {
  return ADMIN_NAV_ITEMS.filter(
    item =>
      canViewNavigation(role, item.id, modulePermissions) &&
      canAccessRoute(role, item.href, modulePermissions)
  );
}

import { canAccessRoute, canViewNavigation, type AdminNavKey } from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/roles";
import type { ModulePermission } from "@/lib/rbac/module-permissions";
import { hasPermission } from "@/lib/rbac/module-permissions";

export type NavigationItem = {
  id: AdminNavKey;
  href: string;
  label: string;
  description: string;
  modulePermission?: ModulePermission;
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
    description: "Unified trends across enrollment, attendance, finance, exams, and communications.",
    modulePermission: "executive_analytics"
  },
  {
    id: "operations_resilience",
    href: "/admin/operations",
    label: "Backup & Recovery",
    description: "Monitor backup coverage, restore drills, and recovery readiness.",
    modulePermission: "backup_recovery"
  },
  {
    id: "super_admin_console",
    href: "/admin/super-admin",
    label: "Super Admin Console",
    description: "Identity, governance, and global controls.",
    modulePermission: "super_admin_console"
  },
  {
    id: "principal_dashboard",
    href: "/admin/principal",
    label: "Principal Dashboard",
    description: "School leadership decisions and approvals.",
    modulePermission: "principal_dashboard"
  },
  {
    id: "principal_staff_accounts",
    href: "/admin/principal/staff-accounts",
    label: "Staff Accounts",
    description: "Principal-managed teacher and worker accounts.",
    modulePermission: "staff_accounts"
  },
  {
    id: "reception_dashboard",
    href: "/admin/reception",
    label: "Reception / Admissions",
    description: "Application pipeline and registration intake.",
    modulePermission: "reception_admissions"
  },
  {
    id: "finance_dashboard",
    href: "/admin/finance",
    label: "Finance Ops",
    description: "Invoices, collections, and payment operations.",
    modulePermission: "finance_ops"
  },
  {
    id: "registration_wizard",
    href: "/admin/registration",
    label: "6-Step Registration Wizard",
    description: "Structured student registration data capture.",
    modulePermission: "registration_wizard"
  },
  {
    id: "exams_suite",
    href: "/admin/exams",
    label: "Exams & Grading",
    description: "Kenyan term exams, marks entry, and report cards.",
    modulePermission: "exams_grading"
  },
  {
    id: "communications_center",
    href: "/admin/communications",
    label: "Communications Centre",
    description: "Send messages to parents and guardians via SMS and email.",
    modulePermission: "communications_centre"
  },
  {
    id: "documents_center",
    href: "/admin/documents",
    label: "Document Center",
    description: "Track uploads, verification lifecycle, and expiry reminders.",
    modulePermission: "document_center"
  },
  {
    id: "attendance_module",
    href: "/admin/attendance",
    label: "Attendance",
    description: "Track and manage student attendance records.",
    modulePermission: "attendance"
  }
];

export function getVisibleNavigation(user: {
  role: AppRole;
  permissions: ModulePermission[];
}) {
  return ADMIN_NAV_ITEMS.filter(item => {
    if (!canViewNavigation(user.role, item.id) || !canAccessRoute(user.role, item.href)) {
      return false;
    }

    if (!item.modulePermission) {
      return true;
    }

    return hasPermission(user, item.modulePermission);
  });
}

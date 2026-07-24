import { canPerformAction } from "@/lib/rbac/permissions";
import { ROLE } from "@/lib/rbac/roles";
import type { RoleDashboardData } from "@/lib/dashboard/types";

export const superAdminDashboardData: RoleDashboardData = {
  heading: "Super Admin Console",
  subtitle: "Global governance, security posture, and cross-department controls.",
  kpis: [
    { label: "Active admin accounts", value: "28", trend: "+2 this week", tone: "positive" },
    { label: "High-priority alerts", value: "3", trend: "1 requires override", tone: "warning" },
    { label: "Pending role changes", value: "7", trend: "4 within SLA", tone: "neutral" },
    { label: "Audit events (24h)", value: "126", trend: "No critical violations", tone: "positive" }
  ],
  shortcuts: [
    { label: "User governance", href: "/admin/super-admin/users", hint: "Manage roles and account states" },
    { label: "Audit console", href: "/admin/super-admin/audit", hint: "Inspect governance event trail" },
    { label: "Oversight settings", href: "/admin/super-admin/settings", hint: "Tune policy controls" },
    { label: "Principal reports", href: "/admin/principal/reports", hint: "Review school-level outcomes" },
    { label: "Admissions board", href: "/admin/reception/applications", hint: "Escalations and approval queue" }
  ],
  recentActivity: [
    {
      when: "09:30",
      title: "Override approved",
      detail: "Fee waiver override approved for APP-20260724-0910-441.",
      status: "warning"
    },
    {
      when: "08:55",
      title: "Role assignment update",
      detail: "Reception scope granted to admissions.officer@kenaya.local.",
      status: "success"
    },
    {
      when: "08:12",
      title: "Security policy review",
      detail: "Session timeout baseline review added to backlog.",
      status: "info"
    }
  ],
  tables: [
    {
      title: "Access governance queue",
      caption: "Critical identity and privilege changes awaiting action.",
      columns: ["Request", "Requested by", "Scope", "Priority", "Age"],
      rows: [
        ["Privileged access grant", "principal@kenaya.local", "Finance override", "High", "2h"],
        ["Account deactivation", "hr.ops@kenaya.local", "Reception staff", "Medium", "5h"],
        ["Policy exception", "finance@kenaya.local", "Payment reversal", "High", "1h"]
      ]
    },
    {
      title: "RBAC capability matrix snapshot",
      caption: "Action permissions currently enabled by role.",
      columns: ["Role", "Approve", "Export", "Override", "User Create"],
      rows: [
        [
          "Super Admin",
          canPerformAction(ROLE.SUPER_ADMIN, "application", "approve") ? "Yes" : "No",
          canPerformAction(ROLE.SUPER_ADMIN, "report", "export") ? "Yes" : "No",
          canPerformAction(ROLE.SUPER_ADMIN, "settings", "override") ? "Yes" : "No",
          canPerformAction(ROLE.SUPER_ADMIN, "user", "create") ? "Yes" : "No"
        ],
        [
          "Principal",
          canPerformAction(ROLE.PRINCIPAL, "application", "approve") ? "Yes" : "No",
          canPerformAction(ROLE.PRINCIPAL, "report", "export") ? "Yes" : "No",
          canPerformAction(ROLE.PRINCIPAL, "settings", "override") ? "Yes" : "No",
          canPerformAction(ROLE.PRINCIPAL, "user", "create") ? "Yes" : "No"
        ],
        [
          "Reception",
          canPerformAction(ROLE.RECEPTION, "application", "approve") ? "Yes" : "No",
          canPerformAction(ROLE.RECEPTION, "report", "export") ? "Yes" : "No",
          canPerformAction(ROLE.RECEPTION, "settings", "override") ? "Yes" : "No",
          canPerformAction(ROLE.RECEPTION, "user", "create") ? "Yes" : "No"
        ],
        [
          "Finance",
          canPerformAction(ROLE.FINANCE, "application", "approve") ? "Yes" : "No",
          canPerformAction(ROLE.FINANCE, "report", "export") ? "Yes" : "No",
          canPerformAction(ROLE.FINANCE, "settings", "override") ? "Yes" : "No",
          canPerformAction(ROLE.FINANCE, "user", "create") ? "Yes" : "No"
        ]
      ]
    }
  ]
};

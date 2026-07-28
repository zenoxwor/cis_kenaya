export type DashboardKpi = {
  label: string;
  value: string;
  trend: string;
  tone: "neutral" | "positive" | "warning";
};

export type DashboardShortcut = {
  label: string;
  href: string;
  hint: string;
};

export type DashboardActivity = {
  when: string;
  title: string;
  detail: string;
  status: "info" | "success" | "warning";
};

export type DashboardTable = {
  title: string;
  caption: string;
  columns: string[];
  rows: string[][];
};

export type RoleDashboardData = {
  heading: string;
  subtitle: string;
  kpis: DashboardKpi[];
  shortcuts: DashboardShortcut[];
  recentActivity: DashboardActivity[];
  tables: DashboardTable[];
};

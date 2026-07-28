import type { AppRole } from "@/lib/rbac/roles";

export type DateRangeValue = "7d" | "30d" | "90d";

export type ExecutiveFilters = {
  dateRange: DateRangeValue;
  classId: string;
  termId: string;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterConfig = {
  dateRanges: FilterOption[];
  classes: FilterOption[];
  terms: FilterOption[];
  showClassFilter: boolean;
  showTermFilter: boolean;
};

export type MetricTone = "neutral" | "positive" | "warning";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
  href: string;
};

export type DrilldownLink = {
  label: string;
  href: string;
};

export type FunnelChart = {
  type: "funnel";
  unit: string;
  stages: Array<{
    label: string;
    value: number;
  }>;
};

export type TrendChart = {
  type: "trend";
  unit: string;
  points: Array<{
    label: string;
    value: number;
  }>;
};

export type SplitChart = {
  type: "split";
  unit: string;
  segments: Array<{
    label: string;
    value: number;
    tone: MetricTone;
  }>;
};

export type DashboardChart = FunnelChart | TrendChart | SplitChart;

export type ExecutiveAnalyticsCard = {
  id: string;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  chart: DashboardChart;
  drilldowns: DrilldownLink[];
};

export type ExecutiveAnalyticsSnapshot = {
  role: AppRole;
  filters: ExecutiveFilters;
  filterConfig: FilterConfig;
  cards: ExecutiveAnalyticsCard[];
};

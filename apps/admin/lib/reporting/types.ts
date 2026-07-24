export type ReportMetric = {
  label: string;
  value: string;
  delta: string;
  tone: "neutral" | "positive" | "warning";
};

export type ReportTable = {
  title: string;
  caption: string;
  columns: string[];
  rows: string[][];
};

export type ReportSurfaceData = {
  heading: string;
  subtitle: string;
  metrics: ReportMetric[];
  tables: ReportTable[];
  highlights: string[];
};

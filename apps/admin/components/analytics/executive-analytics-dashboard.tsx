import Link from "next/link";
import type { DashboardChart, ExecutiveAnalyticsSnapshot, MetricTone } from "@/lib/analytics/types";
import { ROLE_LABELS } from "@/lib/rbac/roles";

type ExecutiveAnalyticsDashboardProps = {
  snapshot: ExecutiveAnalyticsSnapshot;
};

function toneClass(tone: MetricTone) {
  if (tone === "positive") {
    return "text-emerald-700";
  }
  if (tone === "warning") {
    return "text-amber-700";
  }
  return "text-slate-600";
}

function clampPercent(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }
  return Math.max(4, Math.min(100, Math.round((value / max) * 100)));
}

function ChartSurface({ chart }: { chart: DashboardChart }) {
  if (chart.type === "funnel") {
    const top = Math.max(...chart.stages.map(stage => stage.value), 1);
    return (
      <div aria-label="Enrollment funnel chart" className="space-y-2" role="img">
        {chart.stages.map(stage => (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>{stage.label}</span>
              <span>{stage.value.toLocaleString("en-US")}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-brand-500" style={{ width: `${clampPercent(stage.value, top)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chart.type === "trend") {
    const top = Math.max(...chart.points.map(point => point.value), 1);
    return (
      <div aria-label="Trend chart" className="space-y-2" role="img">
        {chart.points.map(point => (
          <div key={point.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>{point.label}</span>
              <span>
                {point.value.toFixed(1)}
                {chart.unit.startsWith("%") ? chart.unit : ` ${chart.unit}`}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-slate-800" style={{ width: `${clampPercent(point.value, top)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const top = Math.max(...chart.segments.map(segment => segment.value), 1);
  return (
    <div aria-label="Segment split chart" className="space-y-2" role="img">
      {chart.segments.map(segment => (
        <div key={segment.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>{segment.label}</span>
            <span>{segment.value.toLocaleString("en-US")}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className={[
                "h-3 rounded-full",
                segment.tone === "positive"
                  ? "bg-emerald-500"
                  : segment.tone === "warning"
                    ? "bg-amber-500"
                    : "bg-slate-500"
              ].join(" ")}
              style={{ width: `${clampPercent(segment.value, top)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExecutiveAnalyticsDashboard({ snapshot }: ExecutiveAnalyticsDashboardProps) {
  const { cards, filterConfig, filters } = snapshot;

  return (
    <section className="space-y-6">
      <header className="admin-content-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Executive Analytics</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Unified operational pulse</h1>
        <p className="mt-2 text-sm text-slate-600">
          Active role: <span className="font-medium">{ROLE_LABELS[snapshot.role]}</span>. Signals are filtered by
          both your role permissions and selected scope.
        </p>
      </header>

      <form className="admin-content-card" method="get">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Date range</span>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              defaultValue={filters.dateRange}
              name="dateRange"
            >
              {filterConfig.dateRanges.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {filterConfig.showClassFilter && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Class</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue={filters.classId}
                name="classId"
              >
                {filterConfig.classes.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {filterConfig.showTermFilter && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Term</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                defaultValue={filters.termId}
                name="termId"
              >
                {filterConfig.terms.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="submit">
            Apply filters
          </button>
          <Link className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/admin/analytics">
            Reset
          </Link>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        {cards.map(card => (
          <article key={card.id} className="admin-content-card space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{card.description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {card.metrics.map(metric => (
                <Link
                  key={`${card.id}-${metric.label}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100"
                  href={metric.href}
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{metric.value}</p>
                  <p className={`mt-1 text-xs ${toneClass(metric.tone)}`}>{metric.detail}</p>
                </Link>
              ))}
            </div>

            <ChartSurface chart={card.chart} />

            <div className="space-x-3 border-t border-slate-200 pt-3 text-sm">
              {card.drilldowns.map(link => (
                <Link key={link.href} className="font-semibold" href={link.href}>
                  {link.label} →
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

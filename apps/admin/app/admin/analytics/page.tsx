import { ExecutiveAnalyticsDashboard } from "@/components/analytics/executive-analytics-dashboard";
import { requireCurrentUser } from "@/lib/auth/session";
import { getExecutiveAnalyticsSnapshot } from "@/lib/analytics/repository";

type AdminAnalyticsPageProps = {
  searchParams?: Promise<{
    dateRange?: string;
    classId?: string;
    termId?: string;
  }>;
};

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  const user = await requireCurrentUser("/admin/analytics");
  const resolved = searchParams ? await searchParams : undefined;
  const snapshot = getExecutiveAnalyticsSnapshot({
    role: user.role,
    requestedFilters: {
      dateRange: resolved?.dateRange,
      classId: resolved?.classId,
      termId: resolved?.termId
    }
  });

  return <ExecutiveAnalyticsDashboard snapshot={snapshot} />;
}

import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/session";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { ROLE } from "@/lib/rbac/roles";
import { getSupabaseStorageClient } from "@/lib/supabase/client";
import { DailyReportsView } from "@/components/finance/daily-reports-view";
import type { DailyReportSnapshot } from "@/lib/reception/daily-report-snapshot";

const BUCKET = "student-documents";
const PREFIX = "reception/daily-reports";
const SIGNED_URL_TTL = 3600;

function todayDateString() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type ReportFile = {
  date: string;
  jsonUrl: string | null;
  csvUrl: string | null;
};

async function listReportFiles(): Promise<ReportFile[]> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) return [];

  const { data, error } = await supabase.storage.from(BUCKET).list(PREFIX, {
    sortBy: { column: "name", order: "desc" }
  });

  if (error || !data) return [];

  // Collect all JSON files and pair them with matching CSV files.
  const jsonFiles = data.filter(f => f.name.endsWith(".json"));
  const csvNames = new Set(data.filter(f => f.name.endsWith(".csv")).map(f => f.name));

  const files: ReportFile[] = await Promise.all(
    jsonFiles.map(async f => {
      const date = f.name.replace(/\.json$/, "");
      const jsonPath = `${PREFIX}/${f.name}`;
      const csvName = `${date}.csv`;
      const csvPath = `${PREFIX}/${csvName}`;

      const [jsonSigned, csvSigned] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(jsonPath, SIGNED_URL_TTL),
        csvNames.has(csvName)
          ? supabase.storage.from(BUCKET).createSignedUrl(csvPath, SIGNED_URL_TTL)
          : Promise.resolve({ data: null })
      ]);

      return {
        date,
        jsonUrl: jsonSigned.data?.signedUrl ?? null,
        csvUrl: (csvSigned as { data: { signedUrl?: string } | null }).data?.signedUrl ?? null
      };
    })
  );

  return files.sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchTodaySnapshot(): Promise<DailyReportSnapshot | null> {
  const supabase = getSupabaseStorageClient();
  if (!supabase) return null;

  const today = todayDateString();
  const path = `${PREFIX}/${today}.json`;

  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;

  try {
    const text = await data.text();
    return JSON.parse(text) as DailyReportSnapshot;
  } catch {
    return null;
  }
}

export default async function FinanceDailyReportsPage() {
  const user = await requireCurrentUser("/admin/finance/daily-reports");

  const canView =
    user.role === ROLE.SUPER_ADMIN ||
    user.role === ROLE.PRINCIPAL ||
    (user.role === ROLE.FINANCE &&
      hasModulePermission(user.modulePermissions, user.role, "finance_ops"));

  if (!canView) {
    redirect("/admin/unauthorized");
  }

  const [files, todaySnapshot] = await Promise.all([
    listReportFiles(),
    fetchTodaySnapshot()
  ]);

  return (
    <section className="space-y-4">
      <DailyReportsView files={files} todaySnapshot={todaySnapshot} />
    </section>
  );
}

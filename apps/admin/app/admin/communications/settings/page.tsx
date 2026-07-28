import { TriggerConfigPanel } from "@/components/communications/trigger-config-panel";
import { getTriggerConfig } from "@/lib/communications/triggers";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import Link from "next/link";

export default async function CommunicationsSettingsPage() {
  const user = await requireCurrentUser("/admin/communications/settings");
  const canEdit = canPerformAction(user.role, "settings", "edit");
  const config = getTriggerConfig();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/communications" className="text-sm text-slate-400 hover:text-brand-700">
          ← Communications
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Communication Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure automated trigger notices sent to parents and guardians.
        </p>
      </div>
      <TriggerConfigPanel config={config} readOnly={!canEdit} />
    </section>
  );
}

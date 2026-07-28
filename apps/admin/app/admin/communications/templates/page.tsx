import { listTemplates } from "@/lib/communications/repository";
import { TemplatesManager } from "@/components/communications/templates-manager";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  const user = await requireCurrentUser("/admin/communications/templates");

  if (!canPerformAction(user.role, "message_template", "view")) {
    redirect("/admin/unauthorized");
  }

  const canManage = canPerformAction(user.role, "message_template", "create");
  const templates = listTemplates();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Reusable message templates for SMS and email communications.
          </p>
        </div>
      </div>
      <TemplatesManager templates={templates} canManage={canManage} />
    </section>
  );
}

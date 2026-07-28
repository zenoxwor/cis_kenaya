import { listTemplates } from "@/lib/communications/repository";
import { ComposeForm } from "@/components/communications/compose-form";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";

export default async function ComposePage() {
  const user = await requireCurrentUser("/admin/communications/compose");

  if (!canPerformAction(user.role, "communication", "create")) {
    redirect("/admin/unauthorized");
  }

  const templates = listTemplates();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compose Message</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a template and audience to send a communication to parents and guardians.
        </p>
      </div>
      <ComposeForm templates={templates} senderName={user.fullName} senderRole={user.role} />
    </section>
  );
}

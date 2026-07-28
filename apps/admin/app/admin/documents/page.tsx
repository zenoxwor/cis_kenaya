import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/session";
import { canPerformAction } from "@/lib/rbac/permissions";
import { listDocumentRecordsForUser } from "@/lib/document-center/repository";
import { DocumentCenterHub } from "@/components/documents/document-center-hub";

export default async function DocumentsPage() {
  const user = await requireCurrentUser("/admin/documents");

  if (!canPerformAction(user.role, "student_document", "view")) {
    redirect("/admin/unauthorized");
  }

  const records = listDocumentRecordsForUser(user);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Document Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage upload verification, expiry schedules, and reminder workflows for student records.
        </p>
      </div>
      <DocumentCenterHub initialRecords={records} />
    </section>
  );
}

import { DocumentsManager } from "@/components/reception/documents-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";

export default async function ReceptionDocumentsPage() {
  await requireReceptionUser("/admin/reception/documents");

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <DocumentsManager />
    </section>
  );
}

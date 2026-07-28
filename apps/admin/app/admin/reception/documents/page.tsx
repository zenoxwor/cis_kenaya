import { DocumentsManager } from "@/components/reception/documents-manager";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";
import {
  listStudentDocumentOverview,
  listStudentDocuments
} from "@/lib/reception/repository";
import { REQUIRED_RECEPTION_DOCUMENT_TYPES } from "@/lib/reception/types";

export default async function ReceptionDocumentsPage() {
  const user = await requireReceptionUser("/admin/reception/documents");
  const [overview, records] = await Promise.all([
    listStudentDocumentOverview(user),
    listStudentDocuments(user)
  ]);

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <DocumentsManager
        initialOverview={overview}
        initialRecords={records}
        requiredTypes={REQUIRED_RECEPTION_DOCUMENT_TYPES}
      />
    </section>
  );
}

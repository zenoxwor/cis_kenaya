import { MarksEntryGrid } from "@/components/exams/marks-entry-grid";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function ExamsMarksPage() {
  const user = await requireCurrentUser("/admin/exams/marks");
  return <MarksEntryGrid role={user.role} userId={user.id} />;
}

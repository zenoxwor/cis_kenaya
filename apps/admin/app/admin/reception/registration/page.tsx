import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { ReceptionNav } from "@/components/reception/reception-nav";
import { requireReceptionUser } from "@/lib/reception/access";

type ReceptionRegistrationPageProps = {
  searchParams?: Promise<{
    draft?: string;
  }>;
};

export default async function ReceptionRegistrationPage({
  searchParams
}: ReceptionRegistrationPageProps) {
  await requireReceptionUser("/admin/reception/registration");
  const resolved = searchParams ? await searchParams : undefined;

  return (
    <section className="space-y-4">
      <ReceptionNav />
      <RegistrationWizard initialDraftId={resolved?.draft} />
    </section>
  );
}

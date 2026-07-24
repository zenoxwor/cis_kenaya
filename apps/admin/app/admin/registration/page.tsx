import { RegistrationWizard } from "@/components/registration/registration-wizard";

type RegistrationPageProps = {
  searchParams?: Promise<{
    draft?: string;
  }>;
};

export default async function RegistrationPage({ searchParams }: RegistrationPageProps) {
  const resolved = searchParams ? await searchParams : undefined;
  return <RegistrationWizard initialDraftId={resolved?.draft} />;
}

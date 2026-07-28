import Link from "next/link";

type RegistrationVerifiedPageProps = {
  searchParams?: Promise<{
    status?: string;
    name?: string;
  }>;
};

function getStatusView(status: string, name: string | null) {
  if (status === "success") {
    return {
      icon: "✓",
      iconClassName: "bg-emerald-100 text-emerald-700",
      title: "Email Verified Successfully!",
      description: `Welcome to Capital International School Kenya${name ? `, ${name}` : ""}!`,
      detail: "Our admissions team will contact you within 24-48 hours."
    };
  }

  if (status === "invalid") {
    return {
      icon: "!",
      iconClassName: "bg-amber-100 text-amber-700",
      title: "Verification Link Invalid",
      description: "This verification link is invalid or has already been used.",
      detail: "If you still need help, contact our admissions team."
    };
  }

  return {
    icon: "✕",
    iconClassName: "bg-rose-100 text-rose-700",
    title: "Verification Error",
    description: "Something went wrong. Please contact us at info@ciskenya.ac.ke.",
    detail: "Our team will help you complete your pre-registration."
  };
}

export default async function RegistrationVerifiedPage({ searchParams }: RegistrationVerifiedPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const status = params?.status ?? "error";
  const name = params?.name?.trim() ?? null;
  const view = getStatusView(status, name);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl border border-slate-800 bg-white p-8 shadow-xl sm:p-10">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-500">
            Capital International School Kenya
          </p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Cambridge Pre-Registration</h1>
        </header>

        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={[
              "flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold",
              view.iconClassName
            ].join(" ")}
            aria-hidden="true"
          >
            {view.icon}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{view.title}</h2>
          <p className="text-base text-slate-700">{view.description}</p>
          <p className="text-sm text-slate-500">{view.detail}</p>
        </div>

        <div className="flex justify-center">
          <Link
            href={process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ciskenya.ac.ke"}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-brand-400 transition hover:bg-slate-700"
          >
            Visit Our Website
          </Link>
        </div>
      </section>
    </main>
  );
}

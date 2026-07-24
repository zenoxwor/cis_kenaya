import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-6 p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
        Kenaya CIS Platform
      </p>
      <h1 className="text-4xl font-bold text-slate-900">Admin System Foundation</h1>
      <p className="mx-auto max-w-2xl text-slate-600">
        The public preregistration website remains at repository root. This Next.js app is
        the dedicated internal admin surface.
      </p>
      <div>
        <Link
          className="inline-flex rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          href="/sign-in"
        >
          Sign in to Admin
        </Link>
      </div>
    </main>
  );
}

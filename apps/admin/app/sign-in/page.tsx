import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthMode } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/session";
import { isSafeInternalPath } from "@/lib/auth/paths";

type SignInPageProps = {
  searchParams?: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const authMode = getAuthMode();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolvedSearchParams?.next ?? "/admin";
  const safeNextPath = isSafeInternalPath(nextPath) ? nextPath : "/admin";
  const error = resolvedSearchParams?.error;

  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirect(safeNextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Admin Access</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in to Kenya CIS Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Authentication mode: <span className="font-medium">{authMode}</span>
        </p>

        {error === "invalid_credentials" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Incorrect username or password. Please try again.
          </p>
        )}

        {authMode === "mock" ? (
          <form action="/api/auth/mock-sign-in" className="mt-6 space-y-4" method="post">
            <input name="next" type="hidden" value={safeNextPath} />
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Username</span>
              <input
                autoComplete="username"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
                name="username"
                placeholder="Enter username"
                required
                type="text"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
                name="password"
                placeholder="Enter password"
                required
                type="password"
              />
            </label>
            <div className="flex items-center justify-between text-sm">
              <Link className="text-slate-600 hover:text-slate-900" href="/sign-in?help=password-reset">
                Forgot password?
              </Link>
              <span className="text-xs text-slate-500">Mock credentials enabled</span>
            </div>
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              type="submit"
            >
              Sign in
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            External identity provider integration is expected in this mode. Wire your SSO provider and
            callback routes, then disable mock auth.
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          This mock sign-in path is for development only and stores an HTTP-only cookie session without
          cryptographic signing. Default dev credentials are username-based (e.g. superadmin/admin123).
          Replace with signed/JWT or provider sessions before production rollout.
        </p>
      </section>
    </main>
  );
}

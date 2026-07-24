import { redirect } from "next/navigation";
import { getAuthMode } from "@/lib/auth/config";
import { MOCK_AUTH_USERS } from "@/lib/auth/mock-users";
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
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in to Kenaya CIS Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Authentication mode: <span className="font-medium">{authMode}</span>
        </p>

        {error === "invalid_user" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign-in failed: unknown mock user.
          </p>
        )}

        {authMode === "mock" ? (
          <div className="mt-6 space-y-3">
            {MOCK_AUTH_USERS.map(user => (
              <form key={user.email} action="/api/auth/mock-sign-in" method="post">
                <input type="hidden" name="email" value={user.email} />
                <input type="hidden" name="next" value={safeNextPath} />
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                  type="submit"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{user.fullName}</span>
                    <span className="block text-xs text-slate-500">{user.email}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {user.role}
                  </span>
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            External identity provider integration is expected in this mode. Wire your SSO provider and
            callback routes, then disable mock auth.
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          This mock sign-in path is for development only and stores an HTTP-only cookie session without
          cryptographic signing. Replace with signed/JWT or provider sessions before production rollout.
        </p>
      </section>
    </main>
  );
}

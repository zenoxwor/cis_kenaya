"use client";

import { useCurrentSession } from "@/components/providers/session-provider";
import { ROLE_LABELS } from "@/lib/rbac/roles";

type TopbarProps = {
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
};

export function Topbar({ onToggleSidebar, onToggleMobileMenu }: TopbarProps) {
  const user = useCurrentSession();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={onToggleMobileMenu}
        >
          ☰
        </button>
        <button
          type="button"
          aria-label="Toggle sidebar"
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:inline-flex"
          onClick={onToggleSidebar}
        >
          ⇆
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            <span className="sm:hidden">CIS Admin</span>
            <span className="hidden sm:inline">Kenya CIS Administration</span>
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">Role: {ROLE_LABELS[user.role]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 sm:inline-flex"
        >
          Notifications
        </button>
        <form action="/api/auth/sign-out" method="post">
          <button
            className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            type="submit"
          >
            Sign out
          </button>
        </form>
        <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
          <p className="text-sm font-medium text-slate-900">{user.fullName}</p>
          <p className="text-xs text-slate-500">Profile controls placeholder</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 sm:hidden">
          {user.fullName
            .split(" ")
            .slice(0, 2)
            .map(n => n[0])
            .join("")
            .toUpperCase()}
        </div>
      </div>
    </header>
  );
}

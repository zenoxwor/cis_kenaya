"use client";

import { useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { SessionProvider } from "@/components/providers/session-provider";
import type { SessionUser } from "@/lib/auth/types";
import type { NavigationItem } from "@/lib/rbac/navigation";

type AdminShellProps = {
  children: React.ReactNode;
  navItems: NavigationItem[];
  user: SessionUser;
};

export function AdminShell({ children, navItems, user }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SessionProvider user={user}>
      <div className="min-h-screen bg-slate-50" dir="ltr">
        <div className="flex min-h-screen">
          <div className="hidden md:block">
            <Sidebar items={navItems} collapsed={collapsed} />
          </div>

          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <div
                className="relative h-full w-[280px] bg-white"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex h-16 items-center justify-end border-b border-slate-200 px-4">
                  <button
                    type="button"
                    aria-label="Close menu"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                <Sidebar
                  items={navItems}
                  collapsed={false}
                  onNavigate={() => {
                    setMobileOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <Topbar
              onToggleSidebar={() => {
                setCollapsed(prev => !prev);
              }}
              onToggleMobileMenu={() => {
                setMobileOpen(prev => !prev);
              }}
            />
            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}

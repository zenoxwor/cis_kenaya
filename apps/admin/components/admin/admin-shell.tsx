"use client";

import { useState } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import type { NavigationItem } from "@/lib/rbac/navigation";

type AdminShellProps = {
  children: React.ReactNode;
  navItems: NavigationItem[];
  roleLabel: string;
  userName: string;
};

export function AdminShell({ children, navItems, roleLabel, userName }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50" dir="ltr">
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <Sidebar items={navItems} collapsed={collapsed} />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden">
            <div className="h-full w-[280px] bg-white">
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
            roleLabel={roleLabel}
            userName={userName}
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
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/lib/rbac/navigation";

type SidebarProps = {
  items: NavigationItem[];
  collapsed: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ items, collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "h-full border-r border-slate-200 bg-white transition-all",
        collapsed ? "w-[88px]" : "w-[280px]"
      ].join(" ")}
    >
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-bold text-white">
          CIS
        </div>
        {!collapsed && (
          <div className="ml-3">
            <p className="text-sm font-semibold">Kenya CIS</p>
            <p className="text-xs text-slate-500">Admin Portal</p>
          </div>
        )}
      </div>

      <nav className="space-y-1 p-3">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              ].join(" ")}
              href={item.href}
              onClick={onNavigate}
            >
              <span className="text-base">•</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

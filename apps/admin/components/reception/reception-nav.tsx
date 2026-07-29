"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const RECEPTION_LINKS = [
  { href: "/admin/reception/check-in", label: "Employee Attendance" },
  { href: "/admin/reception/timetables", label: "Class Timetables" },
  { href: "/admin/reception/incidents", label: "Incidents & Complaints" }
] as const;

export function ReceptionNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-content-card overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-2 whitespace-nowrap">
        {RECEPTION_LINKS.map(link => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-500 text-white hover:bg-brand-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const RECEPTION_LINKS = [
  { href: "/admin/reception", label: "Dashboard" },
  { href: "/admin/reception/check-in", label: "Staff Check-In" },
  { href: "/admin/reception/incidents", label: "Incidents & Inquiries" },
  { href: "/admin/reception/visitors", label: "Visitors & Gate Passes" },
  { href: "/admin/reception/early-pickup", label: "Early Pick-Up" },
  { href: "/admin/reception/appointments", label: "Appointments" },
  { href: "/admin/reception/lost-found", label: "Lost & Found" },
  { href: "/admin/reception/documents", label: "Document Intake" }
] as const;

export function ReceptionNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-content-card overflow-x-auto p-3">
      <div className="flex min-w-max gap-2">
        {RECEPTION_LINKS.map(link => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
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

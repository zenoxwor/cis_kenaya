"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const RECEPTION_LINKS = [
  { href: "/admin/reception/pre-registrations", label: "Pre-Registrations" },
  { href: "/admin/registration", label: "Registration Wizard" },
  { href: "/admin/reception/visitors", label: "Visitor Log & Gate Pass" },
  { href: "/admin/reception/incidents", label: "Incidents & Complaints" },
  { href: "/admin/reception/appointments", label: "Appointments" },
  { href: "/admin/documents", label: "Document Center" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/communications", label: "Communications Centre" }
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

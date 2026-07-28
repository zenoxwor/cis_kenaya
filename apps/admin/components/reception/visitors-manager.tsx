"use client";

import { useState } from "react";
import type { GatePassItem } from "@/lib/reception/types";

type Props = {
  initialPasses: GatePassItem[];
};

type VisitorsApiPayload = {
  success: boolean;
  data?: GatePassItem[];
};

export function VisitorsManager({ initialPasses }: Props) {
  const [passes, setPasses] = useState(initialPasses);
  const [form, setForm] = useState({
    visitorName: "",
    visitorId: "",
    purpose: "",
    personToMeet: "",
    department: "Admin"
  });

  async function refresh() {
    const response = await fetch("/api/reception?section=visitors");
    const payload = (await response.json()) as VisitorsApiPayload;
    if (payload.success && payload.data) {
      setPasses(payload.data);
    }
  }

  async function createPass() {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "gatepass.create", ...form })
    });
    setForm({
      visitorName: "",
      visitorId: "",
      purpose: "",
      personToMeet: "",
      department: "Admin"
    });
    await refresh();
  }

  async function checkout(gatePassId: string) {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "gatepass.checkout", gatePassId })
    });
    await refresh();
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Visitor Management & Gate Passes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Log all visitors and print digital gate passes with on-campus/departed status.
        </p>
      </header>

      <article className="admin-content-card space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">New visitor</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Full name"
            value={form.visitorName}
            onChange={event => setForm(prev => ({ ...prev, visitorName: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="ID number"
            value={form.visitorId}
            onChange={event => setForm(prev => ({ ...prev, visitorId: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Purpose"
            value={form.purpose}
            onChange={event => setForm(prev => ({ ...prev, purpose: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Person to meet"
            value={form.personToMeet}
            onChange={event => setForm(prev => ({ ...prev, personToMeet: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Department"
            value={form.department}
            onChange={event => setForm(prev => ({ ...prev, department: event.target.value }))}
          />
        </div>
        <button
          type="button"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          onClick={() => {
            void createPass();
          }}
        >
          Generate gate pass
        </button>
      </article>

      <article className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Pass #</th>
              <th className="px-3 py-2">Visitor</th>
              <th className="px-3 py-2">Purpose</th>
              <th className="px-3 py-2">Meet</th>
              <th className="px-3 py-2">Time in</th>
              <th className="px-3 py-2">Time out</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Pass</th>
            </tr>
          </thead>
          <tbody>
            {passes.map(pass => (
              <tr key={pass.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-900">{pass.passNumber}</td>
                <td className="px-3 py-2">
                  {pass.visitorName}
                  <p className="text-xs text-slate-500">{pass.visitorId}</p>
                </td>
                <td className="px-3 py-2">{pass.purpose}</td>
                <td className="px-3 py-2">
                  {pass.personToMeet}
                  <p className="text-xs text-slate-500">{pass.department}</p>
                </td>
                <td className="px-3 py-2">{new Date(pass.checkInTime).toLocaleTimeString("en-KE")}</td>
                <td className="px-3 py-2">
                  {pass.checkOutTime ? new Date(pass.checkOutTime).toLocaleTimeString("en-KE") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      pass.status === "ON_CAMPUS"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    ].join(" ")}
                  >
                    {pass.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                    onClick={() => window.print()}
                  >
                    Print
                  </button>
                  {pass.status === "ON_CAMPUS" && (
                    <button
                      type="button"
                      className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        void checkout(pass.id);
                      }}
                    >
                      Check out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

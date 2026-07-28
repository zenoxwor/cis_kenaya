"use client";

import { useState } from "react";
import type { LostFoundItemView } from "@/lib/reception/types";

type Props = {
  initialItems: LostFoundItemView[];
};

type LostFoundPayload = {
  success: boolean;
  data?: LostFoundItemView[];
};

export function LostFoundManager({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState({
    description: "",
    foundBy: "",
    location: "",
    foundDate: ""
  });

  async function refresh() {
    const response = await fetch("/api/reception?section=lost-found");
    const payload = (await response.json()) as LostFoundPayload;
    if (payload.success && payload.data) {
      setItems(payload.data);
    }
  }

  async function save() {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lostfound.create", ...form })
    });
    setForm({ description: "", foundBy: "", location: "", foundDate: "" });
    await refresh();
  }

  async function mark(id: string, status: "UNCLAIMED" | "CLAIMED") {
    const claimedBy = status === "CLAIMED" ? window.prompt("Claimed by (name):") ?? "" : "";
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lostfound.status", id, status, claimedBy })
    });
    await refresh();
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Lost & Found Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Capture found items and track pickup verification status.
        </p>
      </header>

      <article className="admin-content-card space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Record found item</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Description"
            value={form.description}
            onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Found by"
            value={form.foundBy}
            onChange={event => setForm(prev => ({ ...prev, foundBy: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Location"
            value={form.location}
            onChange={event => setForm(prev => ({ ...prev, location: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="date"
            value={form.foundDate}
            onChange={event => setForm(prev => ({ ...prev, foundDate: event.target.value }))}
          />
        </div>
        <button
          type="button"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          onClick={() => {
            void save();
          }}
        >
          Save item
        </button>
      </article>

      <article className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Found by</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Found date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2">{item.foundBy}</td>
                <td className="px-3 py-2">{item.location}</td>
                <td className="px-3 py-2">{new Date(item.foundDate).toLocaleDateString("en-KE")}</td>
                <td className="px-3 py-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      item.status === "CLAIMED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    ].join(" ")}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {item.status === "UNCLAIMED" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        void mark(item.id, "CLAIMED");
                      }}
                    >
                      Mark claimed
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {item.claimedBy ? `Claimed by ${item.claimedBy}` : "Claimed"}
                    </span>
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

"use client";

import { useState } from "react";
import type { AppointmentItem } from "@/lib/reception/types";

type Props = {
  initialAppointments: AppointmentItem[];
};

type AppointmentsPayload = {
  success: boolean;
  data?: AppointmentItem[];
};

export function AppointmentsManager({ initialAppointments }: Props) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [form, setForm] = useState({
    title: "",
    description: "",
    parentName: "",
    parentPhone: "",
    meetingWith: "",
    scheduledAt: ""
  });

  async function refresh() {
    const response = await fetch("/api/reception?section=appointments");
    const payload = (await response.json()) as AppointmentsPayload;
    if (payload.success && payload.data) {
      setAppointments(payload.data);
    }
  }

  async function createNew() {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "appointment.create", ...form })
    });
    setForm({
      title: "",
      description: "",
      parentName: "",
      parentPhone: "",
      meetingWith: "",
      scheduledAt: ""
    });
    await refresh();
  }

  async function setStatus(id: string, status: "SCHEDULED" | "COMPLETED" | "CANCELLED") {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "appointment.status", id, status })
    });
    await refresh();
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Appointments Schedule</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage parent and school leadership meetings for the day.
        </p>
      </header>

      <article className="admin-content-card space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Create appointment</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Title"
            value={form.title}
            onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Parent name"
            value={form.parentName}
            onChange={event => setForm(prev => ({ ...prev, parentName: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Parent phone"
            value={form.parentPhone}
            onChange={event => setForm(prev => ({ ...prev, parentPhone: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Meeting with"
            value={form.meetingWith}
            onChange={event => setForm(prev => ({ ...prev, meetingWith: event.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={event => setForm(prev => ({ ...prev, scheduledAt: event.target.value }))}
          />
        </div>
        <textarea
          className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Description"
          value={form.description}
          onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
        />
        <button
          type="button"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          onClick={() => {
            void createNew();
          }}
        >
          Save appointment
        </button>
      </article>

      <article className="admin-content-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Parent</th>
              <th className="px-3 py-2">Meeting with</th>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {item.title}
                  {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                </td>
                <td className="px-3 py-2">
                  {item.parentName}
                  <p className="text-xs text-slate-500">{item.parentPhone ?? "—"}</p>
                </td>
                <td className="px-3 py-2">{item.meetingWith}</td>
                <td className="px-3 py-2">{new Date(item.scheduledAt).toLocaleString("en-KE")}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    value={item.status}
                    onChange={event => {
                      void setStatus(
                        item.id,
                        event.target.value as "SCHEDULED" | "COMPLETED" | "CANCELLED"
                      );
                    }}
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

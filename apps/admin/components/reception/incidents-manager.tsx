"use client";

import { useState } from "react";
import type { IncidentBoardItem, InquiryBoardItem } from "@/lib/reception/types";

type Props = {
  initialIncidents: IncidentBoardItem[];
  initialInquiries: InquiryBoardItem[];
};

type ApiPayload = {
  success: boolean;
  data?: {
    incidents: IncidentBoardItem[];
    inquiries: InquiryBoardItem[];
  };
};

const DEPARTMENTS = ["Principal/Counselor", "Finance", "Operations", "Admin"] as const;

export function IncidentsManager({ initialIncidents, initialInquiries }: Props) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [incidentForm, setIncidentForm] = useState({
    type: "Complaint",
    description: "",
    reportedBy: "",
    department: "Admin"
  });
  const [inquiryForm, setInquiryForm] = useState({
    callerName: "",
    callerPhone: "",
    subject: "",
    notes: "",
    followUpDate: ""
  });

  async function refresh() {
    const response = await fetch("/api/reception?section=incidents");
    const payload = (await response.json()) as ApiPayload;
    if (payload.success && payload.data) {
      setIncidents(payload.data.incidents);
      setInquiries(payload.data.inquiries);
    }
  }

  async function saveIncident() {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "incident.create", ...incidentForm })
    });
    setIncidentForm({ type: "Complaint", description: "", reportedBy: "", department: "Admin" });
    await refresh();
  }

  async function saveInquiry() {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inquiry.create", ...inquiryForm })
    });
    setInquiryForm({
      callerName: "",
      callerPhone: "",
      subject: "",
      notes: "",
      followUpDate: ""
    });
    await refresh();
  }

  async function setIncidentStatus(id: string, status: "PENDING" | "IN_PROGRESS" | "RESOLVED") {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "incident.status", id, status })
    });
    await refresh();
  }

  async function setInquiryStatus(id: string, status: string) {
    await fetch("/api/reception", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inquiry.status", id, status })
    });
    await refresh();
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Incidents, Complaints & Inquiry Routing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Route front-desk complaints to Principal/Counselor, Finance, Operations, or Admin in one click.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="admin-content-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Log incident / complaint</h2>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Type (Complaint, Behavior, Fees, Maintenance...)"
            value={incidentForm.type}
            onChange={event => setIncidentForm(prev => ({ ...prev, type: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Reported by (Parent, Student, Staff name)"
            value={incidentForm.reportedBy}
            onChange={event => setIncidentForm(prev => ({ ...prev, reportedBy: event.target.value }))}
          />
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={incidentForm.department}
            onChange={event => setIncidentForm(prev => ({ ...prev, department: event.target.value }))}
          >
            {DEPARTMENTS.map(department => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Description..."
            value={incidentForm.description}
            onChange={event => setIncidentForm(prev => ({ ...prev, description: event.target.value }))}
          />
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            onClick={() => {
              void saveIncident();
            }}
          >
            Save & route
          </button>
        </article>

        <article className="admin-content-card space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Phone call / inquiry log</h2>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Caller name"
            value={inquiryForm.callerName}
            onChange={event => setInquiryForm(prev => ({ ...prev, callerName: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Caller phone"
            value={inquiryForm.callerPhone}
            onChange={event => setInquiryForm(prev => ({ ...prev, callerPhone: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Subject"
            value={inquiryForm.subject}
            onChange={event => setInquiryForm(prev => ({ ...prev, subject: event.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="date"
            value={inquiryForm.followUpDate}
            onChange={event => setInquiryForm(prev => ({ ...prev, followUpDate: event.target.value }))}
          />
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Notes..."
            value={inquiryForm.notes}
            onChange={event => setInquiryForm(prev => ({ ...prev, notes: event.target.value }))}
          />
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => {
              void saveInquiry();
            }}
          >
            Save inquiry
          </button>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="admin-content-card overflow-x-auto">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Incident status board</h2>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Reported by</th>
                <th className="px-3 py-2">Department</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(item => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.type}</td>
                  <td className="px-3 py-2">{item.reportedBy}</td>
                  <td className="px-3 py-2">{item.department}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      value={item.status}
                      onChange={event => {
                        void setIncidentStatus(
                          item.id,
                          event.target.value as "PENDING" | "IN_PROGRESS" | "RESOLVED"
                        );
                      }}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-content-card overflow-x-auto">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Inquiry follow-up board</h2>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Caller</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Follow-up</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map(item => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.callerName}</td>
                  <td className="px-3 py-2">{item.subject}</td>
                  <td className="px-3 py-2">
                    {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString("en-KE") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      value={item.status}
                      onChange={event => {
                        void setInquiryStatus(item.id, event.target.value);
                      }}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { MessageCampaign, MessageDelivery } from "@/lib/communications/types";
import Link from "next/link";

type Props = {
  campaigns: MessageCampaign[];
  deliveries: MessageDelivery[];
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-500",
  SENT: "bg-sky-100 text-sky-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700"
};

const CAMPAIGN_STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-500",
  SCHEDULED: "bg-brand-100 text-brand-700",
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700"
};

export function DeliveryHistory({ campaigns, deliveries }: Props) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const filteredDeliveries = selectedCampaign
    ? deliveries.filter(d => d.campaignId === selectedCampaign)
    : deliveries;

  return (
    <div className="space-y-6">
      {/* Campaigns table */}
      <div className="admin-content-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Campaigns</h2>
          <Link
            href="/admin/communications/compose"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
          >
            + New Campaign
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pl-4 pr-2">Template</th>
                  <th className="px-2 pb-3">Sent By</th>
                  <th className="px-2 pb-3">Date</th>
                  <th className="px-2 pb-3 text-center">Total</th>
                  <th className="px-2 pb-3 text-center">Sent</th>
                  <th className="px-2 pb-3 text-center">Failed</th>
                  <th className="px-2 pb-3">Status</th>
                  <th className="px-2 pb-3 pr-4 text-right">Deliveries</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 ${selectedCampaign === c.id ? "bg-brand-50" : ""}`}
                  >
                    <td className="py-3 pl-4 pr-2 font-medium text-slate-800">
                      {c.template?.name ?? "—"}
                    </td>
                    <td className="px-2 py-3 text-slate-600">{c.sentByName ?? "—"}</td>
                    <td className="px-2 py-3 text-slate-600">
                      {c.sentAt
                        ? new Date(c.sentAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                        : c.scheduledAt
                        ? `Scheduled ${new Date(c.scheduledAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
                        : "—"}
                    </td>
                    <td className="px-2 py-3 text-center text-slate-600">{c.totalCount || "—"}</td>
                    <td className="px-2 py-3 text-center text-emerald-600">{c.sentCount || "—"}</td>
                    <td className="px-2 py-3 text-center text-red-600">{c.failedCount || "—"}</td>
                    <td className="px-2 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CAMPAIGN_STATUS_BADGE[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCampaign(prev => (prev === c.id ? null : c.id))
                        }
                        className="text-xs text-brand-700 hover:underline"
                      >
                        {selectedCampaign === c.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery logs */}
      <div className="admin-content-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            {selectedCampaign ? "Delivery Log — Campaign" : "All Deliveries"}
          </h2>
          {selectedCampaign && (
            <button
              type="button"
              onClick={() => setSelectedCampaign(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Show all
            </button>
          )}
        </div>

        {filteredDeliveries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No deliveries recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pl-4 pr-2">Guardian</th>
                  <th className="px-2 pb-3">Channel</th>
                  <th className="px-2 pb-3">Contact</th>
                  <th className="px-2 pb-3">Status</th>
                  <th className="px-2 pb-3">Sent At</th>
                  <th className="px-2 pb-3 pr-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map(d => (
                  <tr key={d.id} className="border-t border-slate-100 text-sm">
                    <td className="py-3 pl-4 pr-2 font-medium text-slate-800">{d.guardianName ?? "—"}</td>
                    <td className="px-2 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${d.channel === "SMS" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                        {d.channel}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-slate-500 text-xs">
                      {d.channel === "SMS" ? d.guardianPhone : d.guardianEmail ?? "—"}
                    </td>
                    <td className="px-2 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[d.status]}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-slate-500 text-xs">
                      {d.sentAt
                        ? new Date(d.sentAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) +
                          " " +
                          new Date(d.sentAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-2 py-3 pr-4 text-red-500 text-xs">{d.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

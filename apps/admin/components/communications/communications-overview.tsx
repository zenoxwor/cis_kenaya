"use client";

import Link from "next/link";
import type { CommunicationsStats, MessageCampaign } from "@/lib/communications/types";
import type { AppRole } from "@/lib/rbac/roles";
import { canPerformAction } from "@/lib/rbac/permissions";

type Props = {
  stats: CommunicationsStats;
  role: AppRole;
};

const CATEGORY_COLOURS: Record<string, string> = {
  FEE: "bg-red-100 text-red-700",
  ATTENDANCE: "bg-amber-100 text-amber-700",
  DISCIPLINE: "bg-purple-100 text-purple-700",
  GENERAL: "bg-blue-100 text-blue-700"
};

const STATUS_COLOURS: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-brand-100 text-brand-700",
  DRAFT: "bg-slate-100 text-slate-600",
  FAILED: "bg-red-100 text-red-700"
};

function StatCard({ label, value, note, accent }: { label: string; value: number | string; note?: string; accent?: string }) {
  return (
    <div className="admin-content-card flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
      {note && <p className="text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: MessageCampaign }) {
  const statusColour = STATUS_COLOURS[campaign.status] ?? "bg-slate-100 text-slate-600";
  const catColour = CATEGORY_COLOURS[campaign.template?.category ?? "GENERAL"] ?? "bg-blue-100 text-blue-700";

  return (
    <tr className="border-t border-slate-100 text-sm">
      <td className="py-3 pl-4 pr-2 font-medium text-slate-800">
        {campaign.template?.name ?? "—"}
      </td>
      <td className="px-2 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${catColour}`}>
          {campaign.template?.category ?? "—"}
        </span>
      </td>
      <td className="px-2 py-3 text-slate-600">{campaign.sentByName ?? "—"}</td>
      <td className="px-2 py-3 text-slate-600">
        {campaign.sentAt
          ? new Date(campaign.sentAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
          : campaign.scheduledAt
          ? `Scheduled ${new Date(campaign.scheduledAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
          : "—"}
      </td>
      <td className="px-2 py-3 text-center text-slate-600">{campaign.totalCount || "—"}</td>
      <td className="px-2 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColour}`}>
          {campaign.status}
        </span>
      </td>
    </tr>
  );
}

export function CommunicationsOverview({ stats, role }: Props) {
  const canCompose = canPerformAction(role, "communication", "create");
  const canManageTemplates = canPerformAction(role, "message_template", "create");

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communications Centre</h1>
          <p className="mt-1 text-sm text-slate-500">
            Send SMS and email notices to parents and guardians across CIS Kenya.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCompose && (
            <Link
              href="/admin/communications/compose"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              ✉ Compose Message
            </Link>
          )}
          {canManageTemplates && (
            <Link
              href="/admin/communications/templates"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              📋 Manage Templates
            </Link>
          )}
          <Link
            href="/admin/communications/history"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            📜 Delivery History
          </Link>
          {canManageTemplates && (
            <Link
              href="/admin/communications/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ⚙ Trigger Settings
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Sent" value={stats.totalSent} />
        <StatCard label="Delivered" value={stats.totalDelivered} accent="text-emerald-600" />
        <StatCard label="Failed" value={stats.totalFailed} accent="text-red-600" />
        <StatCard
          label="Delivery Rate"
          value={`${stats.deliveryRate}%`}
          note="delivered / sent"
          accent={stats.deliveryRate >= 90 ? "text-emerald-600" : "text-amber-600"}
        />
      </div>

      {/* Recent Campaigns */}
      <div className="admin-content-card">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Recent Campaigns</h2>
        {stats.recentCampaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No campaigns sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pl-4 pr-2">Template</th>
                  <th className="px-2 pb-3">Category</th>
                  <th className="px-2 pb-3">Sent By</th>
                  <th className="px-2 pb-3">Date</th>
                  <th className="px-2 pb-3 text-center">Recipients</th>
                  <th className="px-2 pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map(c => (
                  <CampaignRow key={c.id} campaign={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {canCompose && (
          <Link href="/admin/communications/compose" className="admin-content-card group flex items-start gap-4 hover:border-brand-300 transition-colors">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 text-xl">✉</div>
            <div>
              <p className="font-semibold text-slate-800 group-hover:text-brand-700">Compose</p>
              <p className="text-xs text-slate-500">Send a new message to parents</p>
            </div>
          </Link>
        )}
        {canManageTemplates && (
          <Link href="/admin/communications/templates" className="admin-content-card group flex items-start gap-4 hover:border-brand-300 transition-colors">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 text-xl">📋</div>
            <div>
              <p className="font-semibold text-slate-800 group-hover:text-brand-700">Templates</p>
              <p className="text-xs text-slate-500">Manage reusable message templates</p>
            </div>
          </Link>
        )}
        <Link href="/admin/communications/history" className="admin-content-card group flex items-start gap-4 hover:border-brand-300 transition-colors">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 text-xl">📜</div>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-brand-700">History</p>
            <p className="text-xs text-slate-500">View delivery logs per guardian</p>
          </div>
        </Link>
      </div>
    </section>
  );
}

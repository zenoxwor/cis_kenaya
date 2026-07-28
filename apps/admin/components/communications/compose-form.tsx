"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessageTemplate, AudienceFilter } from "@/lib/communications/types";
import type { AppRole } from "@/lib/rbac/roles";

type Props = {
  templates: MessageTemplate[];
  senderName: string;
  senderRole: AppRole;
};

const AUDIENCE_OPTIONS: { value: AudienceFilter; label: string; description: string }[] = [
  { value: "all", label: "All Parents / Guardians", description: "Every guardian on record" },
  { value: "fee_overdue", label: "Fee Overdue", description: "Guardians with outstanding fee balance" },
  { value: "attendance_concern", label: "Attendance Concern", description: "Guardians of students with absence streaks" },
  { value: "class", label: "Specific Class", description: "Guardians of a selected class/grade" },
  { value: "individual", label: "Individual Guardian", description: "A single selected guardian" }
];

const CATEGORY_BADGE: Record<string, string> = {
  FEE: "bg-red-100 text-red-700",
  ATTENDANCE: "bg-amber-100 text-amber-700",
  DISCIPLINE: "bg-purple-100 text-purple-700",
  GENERAL: "bg-blue-100 text-blue-700"
};

const TYPE_BADGE: Record<string, string> = {
  SMS: "bg-emerald-100 text-emerald-700",
  EMAIL: "bg-sky-100 text-sky-700",
  BOTH: "bg-brand-100 text-brand-700"
};

export function ComposeForm({ templates, senderName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [templateId, setTemplateId] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [scheduledAt, setScheduledAt] = useState("");
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedTemplate = templates.find(t => t.id === templateId);

  function handleSend() {
    if (!templateId) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/communications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            audienceFilter,
            scheduledAt: scheduledAt || undefined
          })
        });
        const data = (await res.json()) as { success: boolean; campaign?: { id: string; totalCount: number; status: string }; error?: string };
        if (data.success && data.campaign) {
          setResult({
            success: true,
            message: data.campaign.status === "SCHEDULED"
              ? `Campaign scheduled successfully.`
              : `Campaign sent to ${data.campaign.totalCount} guardian(s).`
          });
          setTimeout(() => router.push("/admin/communications/history"), 2000);
        } else {
          setResult({ success: false, message: data.error ?? "Send failed. Please try again." });
        }
      } catch {
        setResult({ success: false, message: "Network error. Please try again." });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Form panel */}
      <div className="space-y-6 lg:col-span-2">
        {/* Template selector */}
        <div className="admin-content-card space-y-4">
          <h2 className="font-semibold text-slate-900">1. Select Template</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplateId(tpl.id)}
                className={[
                  "rounded-lg border p-3 text-left transition-colors",
                  templateId === tpl.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-brand-300"
                ].join(" ")}
              >
                <p className="text-sm font-medium text-slate-800">{tpl.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[tpl.category]}`}>
                    {tpl.category}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[tpl.type]}`}>
                    {tpl.type}
                  </span>
                  {tpl.isSystem && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">System</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Audience filter */}
        <div className="admin-content-card space-y-4">
          <h2 className="font-semibold text-slate-900">2. Choose Audience</h2>
          <div className="space-y-2">
            {AUDIENCE_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  audienceFilter === opt.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-200 bg-white hover:border-brand-300"
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="audienceFilter"
                  value={opt.value}
                  checked={audienceFilter === opt.value}
                  onChange={() => setAudienceFilter(opt.value)}
                  className="mt-0.5 accent-brand-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Schedule (optional) */}
        <div className="admin-content-card space-y-4">
          <h2 className="font-semibold text-slate-900">3. Schedule (Optional)</h2>
          <p className="text-sm text-slate-500">
            Leave blank to send immediately, or pick a future date and time.
          </p>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Result banner */}
        {result && (
          <div
            className={[
              "rounded-lg border px-4 py-3 text-sm font-medium",
              result.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            ].join(" ")}
          >
            {result.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={!templateId || isPending}
            className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Sending…" : scheduledAt ? "Schedule Send" : "Send Now"}
          </button>
          <button
            type="button"
            onClick={() => setPreview(v => !v)}
            disabled={!templateId}
            className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {preview ? "Hide Preview" : "Preview Message"}
          </button>
        </div>
      </div>

      {/* Preview panel */}
      <div className="space-y-4">
        <div className="admin-content-card space-y-3">
          <h2 className="font-semibold text-slate-900">Sender</h2>
          <p className="text-sm text-slate-600">{senderName}</p>
          <p className="text-xs text-slate-400">CIS Kenya Admin Portal</p>
        </div>

        {preview && selectedTemplate && (
          <div className="admin-content-card space-y-3">
            <h2 className="font-semibold text-slate-900">Message Preview</h2>
            {selectedTemplate.subject && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Subject</p>
                <p className="mt-1 text-sm text-slate-700">{selectedTemplate.subject}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Body</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{selectedTemplate.body}</p>
            </div>
            <p className="text-xs text-slate-400">
              Variables like <code className="rounded bg-slate-100 px-1">{"{{guardianName}}"}</code> will be substituted at send time.
            </p>
          </div>
        )}

        {!selectedTemplate && (
          <div className="admin-content-card flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-3xl">✉</span>
            <p className="text-sm text-slate-400">Select a template to preview the message.</p>
          </div>
        )}
      </div>
    </div>
  );
}

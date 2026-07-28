"use client";

import { useState, useTransition } from "react";
import type { MessageTemplate, MessageCategory, MessageType } from "@/lib/communications/types";
import Link from "next/link";

type Props = {
  templates: MessageTemplate[];
  canManage: boolean;
};

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

const CATEGORIES: MessageCategory[] = ["FEE", "ATTENDANCE", "DISCIPLINE", "GENERAL"];
const TYPES: MessageType[] = ["SMS", "EMAIL", "BOTH"];

type FormState = {
  name: string;
  subject: string;
  body: string;
  type: MessageType;
  category: MessageCategory;
};

const EMPTY_FORM: FormState = { name: "", subject: "", body: "", type: "BOTH", category: "GENERAL" };

export function TemplatesManager({ templates, canManage }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localTemplates, setLocalTemplates] = useState(templates);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function openEdit(tpl: MessageTemplate) {
    setEditing(tpl);
    setForm({
      name: tpl.name,
      subject: tpl.subject ?? "",
      body: tpl.body,
      type: tpl.type,
      category: tpl.category
    });
    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.name || !form.body) {
      setError("Name and body are required.");
      return;
    }

    startTransition(async () => {
      try {
        const url = editing
          ? `/api/communications/templates/${editing.id}`
          : "/api/communications/templates";
        const method = editing ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = (await res.json()) as { success: boolean; template?: MessageTemplate; error?: string };
        if (data.success && data.template) {
          if (editing) {
            setLocalTemplates(prev => prev.map(t => t.id === data.template!.id ? data.template! : t));
            setSuccess("Template updated.");
          } else {
            setLocalTemplates(prev => [...prev, data.template!]);
            setSuccess("Template created.");
          }
          setShowForm(false);
        } else {
          setError(data.error ?? "Save failed.");
        }
      } catch {
        setError("Network error.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this template? This cannot be undone.")) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/communications/templates/${id}`, { method: "DELETE" });
        const data = (await res.json()) as { success: boolean; error?: string };
        if (data.success) {
          setLocalTemplates(prev => prev.filter(t => t.id !== id));
          setSuccess("Template deleted.");
        } else {
          setError(data.error ?? "Delete failed.");
        }
      } catch {
        setError("Network error.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{localTemplates.length} template(s) available</p>
        <div className="flex gap-2">
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              + New Template
            </button>
          )}
          <Link
            href="/admin/communications/compose"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ✉ Compose
          </Link>
        </div>
      </div>

      {/* Success / error */}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Create/Edit form */}
      {showForm && canManage && (
        <div className="admin-content-card space-y-4">
          <h2 className="font-semibold text-slate-900">{editing ? "Edit Template" : "New Template"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Fee Overdue Reminder"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Subject (email only)</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Outstanding Balance Notice"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as MessageType }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-500">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as MessageCategory }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Body * — Use <code className="rounded bg-slate-100 px-1">{"{{guardianName}}"}</code>, <code className="rounded bg-slate-100 px-1">{"{{studentName}}"}</code>, etc.
            </label>
            <textarea
              rows={5}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Dear {{guardianName}}, …"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : "Save Template"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      <div className="admin-content-card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-slate-400">
              <th className="pb-3 pl-4 pr-2">Name</th>
              <th className="px-2 pb-3">Category</th>
              <th className="px-2 pb-3">Type</th>
              <th className="px-2 pb-3">System</th>
              {canManage && <th className="px-2 pb-3 text-right pr-4">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {localTemplates.map(tpl => (
              <tr key={tpl.id} className="border-t border-slate-100">
                <td className="py-3 pl-4 pr-2 font-medium text-slate-800">{tpl.name}</td>
                <td className="px-2 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[tpl.category]}`}>
                    {tpl.category}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[tpl.type]}`}>
                    {tpl.type}
                  </span>
                </td>
                <td className="px-2 py-3 text-slate-500">{tpl.isSystem ? "Yes" : "No"}</td>
                {canManage && (
                  <td className="px-2 py-3 text-right pr-4">
                    {!tpl.isSystem ? (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(tpl)}
                          className="text-xs text-brand-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Read-only</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

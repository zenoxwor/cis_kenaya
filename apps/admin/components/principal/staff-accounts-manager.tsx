"use client";

import { useEffect, useMemo, useState } from "react";
import { canPerformAction } from "@/lib/rbac/permissions";
import { createStaffAccountsRepository } from "@/lib/staff-accounts/repository";
import {
  STAFF_ACCOUNT_ROLES,
  STAFF_ACCOUNT_STATUSES,
  type StaffAccountRecord,
  type StaffAccountRole,
  type StaffAccountStatus
} from "@/lib/staff-accounts/types";
import { useCurrentSession } from "@/components/providers/session-provider";

type StaffAccountForm = {
  fullName: string;
  username: string;
  email: string;
  role: StaffAccountRole;
  temporaryPassword: string;
};

const initialForm: StaffAccountForm = {
  fullName: "",
  username: "",
  email: "",
  role: "Teacher",
  temporaryPassword: ""
};

export function StaffAccountsManager() {
  const user = useCurrentSession();
  const repository = useMemo(() => createStaffAccountsRepository(), []);
  const canCreate = canPerformAction(user.role, "staff_account", "create");
  const canEdit = canPerformAction(user.role, "staff_account", "edit");

  const [records, setRecords] = useState<StaffAccountRecord[]>([]);
  const [form, setForm] = useState<StaffAccountForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repository.list().then(data => {
      if (active) {
        setRecords(data);
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (records.length === 0) {
      return;
    }

    repository.save(records).catch(error => {
      console.warn("Failed to persist staff accounts.", error);
    });
  }, [records, repository]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function validateForm() {
    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.temporaryPassword.trim()) {
      setNotice("All account creation fields are required.");
      return false;
    }

    const duplicate = records.find(record => {
      if (editingId && record.id === editingId) {
        return false;
      }

      return (
        record.username.toLowerCase() === form.username.trim().toLowerCase() ||
        record.email.toLowerCase() === form.email.trim().toLowerCase()
      );
    });

    if (duplicate) {
      setNotice("Username or email already exists for another staff account.");
      return false;
    }

    return true;
  }

  function handleCreateOrUpdate() {
    if (!canCreate && !canEdit) {
      setNotice("You do not have permission to manage staff accounts.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (editingId) {
      setRecords(prev =>
        prev.map(record =>
          record.id === editingId
            ? {
                ...record,
                fullName: form.fullName.trim(),
                username: form.username.trim(),
                email: form.email.trim(),
                role: form.role,
                temporaryPassword: form.temporaryPassword.trim(),
                updatedAt: new Date().toISOString()
              }
            : record
        )
      );
      setNotice("Staff account updated.");
    } else {
      const now = new Date().toISOString();
      const newRecord: StaffAccountRecord = {
        id: `staff-${Date.now()}`,
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        status: STAFF_ACCOUNT_STATUSES[0],
        temporaryPassword: form.temporaryPassword.trim(),
        createdAt: now,
        updatedAt: now
      };
      setRecords(prev => [newRecord, ...prev]);
      setNotice("Staff account created.");
    }

    resetForm();
  }

  function handleEdit(record: StaffAccountRecord) {
    if (!canEdit) {
      setNotice("You do not have permission to edit staff accounts.");
      return;
    }

    setEditingId(record.id);
    setForm({
      fullName: record.fullName,
      username: record.username,
      email: record.email,
      role: record.role,
      temporaryPassword: record.temporaryPassword
    });
  }

  function handleStatusChange(recordId: string, status: StaffAccountStatus) {
    if (!canEdit) {
      setNotice("You do not have permission to update account status.");
      return;
    }

    setRecords(prev =>
      prev.map(record =>
        record.id === recordId ? { ...record, status, updatedAt: new Date().toISOString() } : record
      )
    );
    setNotice(`Account marked as ${status}.`);
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">Staff Accounts</h1>
        <p className="mt-2 text-slate-600">
          Principal-managed accounts for teachers and workers. Super Admin retains full platform user
          governance.
        </p>
      </header>

      {notice && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {notice}
        </div>
      )}

      <article className="admin-content-card space-y-3">
        <h2 className="text-lg font-semibold">{editingId ? "Edit staff account" : "Create staff account"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Full Name" value={form.fullName} onChange={value => setForm(prev => ({ ...prev, fullName: value }))} />
          <TextField label="Username" value={form.username} onChange={value => setForm(prev => ({ ...prev, username: value }))} />
          <TextField label="Email" value={form.email} onChange={value => setForm(prev => ({ ...prev, email: value }))} type="email" />
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Role</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
              onChange={event => setForm(prev => ({ ...prev, role: event.target.value as StaffAccountRole }))}
              value={form.role}
            >
              {STAFF_ACCOUNT_ROLES.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Temporary Password"
            value={form.temporaryPassword}
            onChange={value => setForm(prev => ({ ...prev, temporaryPassword: value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={handleCreateOrUpdate}
            type="button"
          >
            {editingId ? "Update account" : "Create account"}
          </button>
          {editingId && (
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100"
              onClick={resetForm}
              type="button"
            >
              Cancel edit
            </button>
          )}
        </div>
      </article>

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold">Teacher & worker accounts</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{record.fullName}</td>
                  <td className="px-3 py-2">{record.username}</td>
                  <td className="px-3 py-2">{record.email}</td>
                  <td className="px-3 py-2">{record.role}</td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-xs font-semibold",
                        record.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      ].join(" ")}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                        onClick={() => handleEdit(record)}
                        type="button"
                      >
                        Edit
                      </button>
                      {record.status === "Active" ? (
                        <button
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                          onClick={() => handleStatusChange(record.id, "Disabled")}
                          type="button"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                          onClick={() => handleStatusChange(record.id, "Active")}
                          type="button"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-700">{props.label}</span>
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
        onChange={event => props.onChange(event.target.value)}
        type={props.type ?? "text"}
        value={props.value}
      />
    </label>
  );
}

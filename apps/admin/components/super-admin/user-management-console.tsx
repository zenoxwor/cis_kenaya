"use client";

import { useEffect, useMemo, useState } from "react";
import { ROLE_LABELS, type AppRole } from "@/lib/rbac/roles";
import { MODULE_PERMISSIONS, type ModulePermission } from "@/lib/rbac/module-permissions";

type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  permissions: ModulePermission[];
  createdAt: string;
  updatedAt: string;
};

type RoleOption = "Principal" | "Accountant" | "Teacher" | "Receptionist" | "Admin";

type CreateUserForm = {
  fullName: string;
  email: string;
  defaultRole: RoleOption;
  initialPassword: string;
  permissions: ModulePermission[];
};

const ROLE_OPTIONS: RoleOption[] = ["Principal", "Accountant", "Teacher", "Receptionist", "Admin"];

const PERMISSION_LABELS: Record<ModulePermission, string> = {
  executive_analytics: "Executive Analytics",
  backup_recovery: "Backup & Recovery",
  super_admin_console: "Super Admin Console",
  principal_dashboard: "Principal Dashboard",
  staff_accounts: "Staff Accounts",
  reception_admissions: "Reception / Admissions",
  finance_ops: "Finance Operations",
  registration_wizard: "Registration Wizard",
  exams_grading: "Exams & Grading",
  communications_centre: "Communications Centre",
  document_center: "Document Center",
  attendance: "Attendance"
};

const DEFAULT_PERMISSIONS_BY_ROLE: Record<RoleOption, ModulePermission[]> = {
  Principal: [
    "executive_analytics",
    "backup_recovery",
    "principal_dashboard",
    "staff_accounts",
    "reception_admissions",
    "registration_wizard",
    "exams_grading",
    "communications_centre",
    "document_center",
    "attendance"
  ],
  Accountant: ["executive_analytics", "finance_ops", "communications_centre"],
  Teacher: ["exams_grading", "attendance"],
  Receptionist: [
    "executive_analytics",
    "reception_admissions",
    "registration_wizard",
    "exams_grading",
    "communications_centre",
    "document_center",
    "attendance"
  ],
  Admin: [...MODULE_PERMISSIONS]
};

const INITIAL_CREATE_FORM: CreateUserForm = {
  fullName: "",
  email: "",
  defaultRole: "Principal",
  initialPassword: "",
  permissions: DEFAULT_PERMISSIONS_BY_ROLE.Principal
};

function toPermissionsSummary(permissions: ModulePermission[]) {
  if (permissions.length === 0) {
    return "No module access";
  }

  return permissions.map(permission => PERMISSION_LABELS[permission]).join(", ");
}

export function UserManagementConsole() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(INITIAL_CREATE_FORM);

  const sortedUsers = useMemo(
    () => [...users].sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [users]
  );

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", { method: "GET", cache: "no-store" });
      const payload = (await response.json()) as { success?: boolean; users?: ManagedUser[]; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.users) {
        throw new Error(payload.error?.message ?? "Failed to load users.");
      }
      setUsers(payload.users);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function togglePermissionSelection(permission: ModulePermission) {
    setCreateForm(previous => {
      const exists = previous.permissions.includes(permission);
      const permissions = exists
        ? previous.permissions.filter(value => value !== permission)
        : [...previous.permissions, permission];
      return { ...previous, permissions };
    });
  }

  function updateCreateRole(defaultRole: RoleOption) {
    setCreateForm(previous => ({
      ...previous,
      defaultRole,
      permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[defaultRole]]
    }));
  }

  async function handleCreateUser() {
    setError(null);
    setNotice(null);

    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.initialPassword.trim()) {
      setError("Full name, email, and initial password are required.");
      return;
    }

    if (createForm.permissions.length === 0) {
      setError("At least one module permission must be enabled.");
      return;
    }

    setGlobalBusy(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      });
      const payload = (await response.json()) as {
        success?: boolean;
        user?: ManagedUser;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.user) {
        throw new Error(payload.error?.message ?? "Failed to create user.");
      }

      setUsers(previous => [payload.user!, ...previous]);
      setNotice(`User account created for ${payload.user.fullName}.`);
      setCreateForm(INITIAL_CREATE_FORM);
      setShowCreateModal(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create user.");
    } finally {
      setGlobalBusy(false);
    }
  }

  async function updateUser(id: string, payload: Record<string, unknown>) {
    setBusyUserId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as {
        success?: boolean;
        user?: ManagedUser;
        temporaryPassword?: string | null;
        error?: { message?: string };
      };
      if (!response.ok || !result.success || !result.user) {
        throw new Error(result.error?.message ?? "Failed to update user.");
      }

      setUsers(previous =>
        previous.map(user => (user.id === id ? result.user! : user))
      );

      if (result.temporaryPassword) {
        setNotice(`Temporary password: ${result.temporaryPassword}`);
      } else {
        setNotice(`Updated account for ${result.user.fullName}.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update user.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDeleteUser(user: ManagedUser) {
    const confirmed = window.confirm(`Delete ${user.fullName} (${user.email})? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setBusyUserId(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { success?: boolean; error?: { message?: string } };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? "Failed to delete user.");
      }

      setUsers(previous => previous.filter(candidate => candidate.id !== user.id));
      setNotice(`Deleted account for ${user.fullName}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to delete user.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleCustomPasswordReset(user: ManagedUser) {
    const customPassword = window.prompt(`Enter a new password for ${user.email}`);
    if (!customPassword) {
      return;
    }

    await updateUser(user.id, {
      resetPassword: {
        mode: "custom",
        customPassword
      }
    });
  }

  async function handleGeneratedPasswordReset(user: ManagedUser) {
    await updateUser(user.id, {
      resetPassword: {
        mode: "generated"
      }
    });
  }

  async function handleToggleUserStatus(user: ManagedUser) {
    await updateUser(user.id, {
      isActive: !user.isActive
    });
  }

  async function handlePermissionToggle(
    user: ManagedUser,
    permission: ModulePermission
  ) {
    const permissions = user.permissions.includes(permission)
      ? user.permissions.filter(value => value !== permission)
      : [...user.permissions, permission];

    if (permissions.length === 0) {
      setError("A user must keep at least one module permission.");
      return;
    }

    await updateUser(user.id, { permissions });
  }

  return (
    <section className="space-y-4">
      <header className="admin-content-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Super Admin User Management</h1>
            <p className="mt-2 text-slate-600">
              Manage accounts, password resets, active status, and module permissions.
            </p>
          </div>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={globalBusy}
            onClick={() => setShowCreateModal(true)}
            type="button"
          >
            Create user
          </button>
        </div>
      </header>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <article className="admin-content-card">
        <h2 className="text-lg font-semibold text-slate-900">User Directory</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading users...</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Full name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Permissions</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(user => (
                  <tr key={user.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">{user.fullName}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">{ROLE_LABELS[user.role]}</td>
                    <td className="px-3 py-2">
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          user.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        ].join(" ")}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="mb-2 text-xs text-slate-600">{toPermissionsSummary(user.permissions)}</p>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {MODULE_PERMISSIONS.map(permission => (
                          <label key={`${user.id}-${permission}`} className="inline-flex items-center gap-2 text-xs">
                            <input
                              checked={user.permissions.includes(permission)}
                              disabled={busyUserId === user.id}
                              onChange={() => handlePermissionToggle(user, permission)}
                              type="checkbox"
                            />
                            <span>{PERMISSION_LABELS[permission]}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-2">
                        <button
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                          disabled={busyUserId === user.id}
                          onClick={() => handleToggleUserStatus(user)}
                          type="button"
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                          disabled={busyUserId === user.id}
                          onClick={() => handleCustomPasswordReset(user)}
                          type="button"
                        >
                          Set password
                        </button>
                        <button
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                          disabled={busyUserId === user.id}
                          onClick={() => handleGeneratedPasswordReset(user)}
                          type="button"
                        >
                          Generate temp password
                        </button>
                        <button
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          disabled={busyUserId === user.id}
                          onClick={() => handleDeleteUser(user)}
                          type="button"
                        >
                          Delete user
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Create user account</h2>
            <p className="mt-1 text-sm text-slate-600">Only Super Admin can create users.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TextField
                label="Full name"
                value={createForm.fullName}
                onChange={value => setCreateForm(previous => ({ ...previous, fullName: value }))}
              />
              <TextField
                label="Email"
                type="email"
                value={createForm.email}
                onChange={value => setCreateForm(previous => ({ ...previous, email: value }))}
              />
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Default role</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
                  onChange={event => updateCreateRole(event.target.value as RoleOption)}
                  value={createForm.defaultRole}
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Initial password"
                type="password"
                value={createForm.initialPassword}
                onChange={value => setCreateForm(previous => ({ ...previous, initialPassword: value }))}
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Module permissions</p>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                {MODULE_PERMISSIONS.map(permission => (
                  <label key={permission} className="inline-flex items-center gap-2 text-sm">
                    <input
                      checked={createForm.permissions.includes(permission)}
                      onChange={() => togglePermissionSelection(permission)}
                      type="checkbox"
                    />
                    <span>{PERMISSION_LABELS[permission]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm(INITIAL_CREATE_FORM);
                  setError(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={globalBusy}
                onClick={handleCreateUser}
                type="button"
              >
                Create user
              </button>
            </div>
          </div>
        </div>
      )}
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


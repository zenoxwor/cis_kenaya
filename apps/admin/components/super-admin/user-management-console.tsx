"use client";

import { useMemo, useState } from "react";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/rbac/roles";
import {
  MODULE_PERMISSION_KEYS,
  MODULE_PERMISSION_LABELS,
  MODULE_PERMISSION_DESCRIPTIONS,
  DEFAULT_ROLE_MODULE_PERMISSIONS,
  type ModulePermissionKey
} from "@/lib/admin/module-permissions";

type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  teachingSubject: string | null;
  role: AppRole;
  isActive: boolean;
  modulePermissions: ModulePermissionKey[];
  mustChangePassword: boolean;
  tempPasswordIssuedAt: string | null;
  passwordUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type UsersApiResponse = {
  success: boolean;
  users: ManagedUser[];
  error?: string;
};

type CreateUserPayload = {
  fullName: string;
  email: string;
  teachingSubject: string;
  role: AppRole;
  isActive: boolean;
  modulePermissions: ModulePermissionKey[];
  passwordMode: "set" | "generate";
  password?: string;
};

type UpdateUserPayload = {
  fullName: string;
  email: string;
  teachingSubject: string;
  role: AppRole;
  isActive: boolean;
  modulePermissions: ModulePermissionKey[];
};

type EditableUserState = {
  fullName: string;
  email: string;
  teachingSubject: string;
  role: AppRole;
  isActive: boolean;
  modulePermissions: ModulePermissionKey[];
  directPassword: string;
};

function createInitialUserPayload(): CreateUserPayload {
  return {
    fullName: "",
    email: "",
    teachingSubject: "",
    role: "RECEPTION",
    isActive: true,
    modulePermissions: [...DEFAULT_ROLE_MODULE_PERMISSIONS.RECEPTION],
    passwordMode: "generate",
    password: ""
  };
}

function toEditableUserState(user: ManagedUser): EditableUserState {
  return {
    fullName: user.fullName,
    email: user.email,
    teachingSubject: user.teachingSubject ?? "",
    role: user.role,
    isActive: user.isActive,
    modulePermissions: [...user.modulePermissions],
    directPassword: ""
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function UserManagementConsole({ initialUsers }: { initialUsers: ManagedUser[] }) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(null);
  const [generatedPasswordByUserId, setGeneratedPasswordByUserId] = useState<
    Record<string, string | null>
  >({});
  const [createDraft, setCreateDraft] = useState<CreateUserPayload>(createInitialUserPayload());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditableUserState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  );

  async function refreshUsers() {
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const json = (await response.json()) as UsersApiResponse;
    if (!response.ok || !json.success) {
      setError(json.error ?? "Failed to fetch users");
      setIsLoading(false);
      return;
    }

    setUsers(json.users);
    setIsLoading(false);
  }

  async function handleCreateUser() {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    setCreatedTempPassword(null);

    const payload = {
      ...createDraft,
      teachingSubject:
        createDraft.role === "TEACHER" ? createDraft.teachingSubject.trim() || undefined : undefined,
      password:
        createDraft.passwordMode === "set" ? createDraft.password?.trim() || undefined : undefined
    };
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      user?: ManagedUser;
      generatedTemporaryPassword?: string | null;
    };

    if (!response.ok || !json.success || !json.user) {
      setError(json.error ?? "Failed to create user");
      setIsLoading(false);
      return;
    }

    setUsers(prev => [json.user!, ...prev]);
    setCreateDraft(createInitialUserPayload());
    if (json.generatedTemporaryPassword) {
      setCreatedTempPassword(json.generatedTemporaryPassword);
      setNotice("User created with a generated temporary password.");
    } else {
      setNotice("User created successfully.");
    }
    setIsLoading(false);
  }

  async function handleSaveUser() {
    if (!editingUserId || !editDraft) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/admin/users/${editingUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: editDraft.fullName,
        email: editDraft.email,
        teachingSubject:
          editDraft.role === "TEACHER" ? editDraft.teachingSubject.trim() || undefined : undefined,
        role: editDraft.role,
        isActive: editDraft.isActive,
        modulePermissions: editDraft.modulePermissions,
        passwordAction: "none"
      })
    });
    const json = (await response.json()) as { success: boolean; error?: string; user?: ManagedUser };
    if (!response.ok || !json.success || !json.user) {
      setError(json.error ?? "Failed to update user");
      setIsLoading(false);
      return;
    }

    setUsers(prev => prev.map(user => (user.id === json.user!.id ? json.user! : user)));
    setEditingUserId(null);
    setEditDraft(null);
    setNotice("User profile updated.");
    setIsLoading(false);
  }

  async function handleToggleActive(user: ManagedUser) {
    setIsLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive: !user.isActive,
        passwordAction: "none"
      })
    });
    const json = (await response.json()) as { success: boolean; error?: string; user?: ManagedUser };
    if (!response.ok || !json.success || !json.user) {
      setError(json.error ?? "Failed to update user status");
      setIsLoading(false);
      return;
    }
    setUsers(prev => prev.map(entry => (entry.id === user.id ? json.user! : entry)));
    setNotice(`User marked as ${json.user.isActive ? "active" : "inactive"}.`);
    setIsLoading(false);
  }

  async function handleGeneratePassword(user: ManagedUser) {
    setIsLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passwordAction: "generate"
      })
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: string;
      user?: ManagedUser;
      generatedTemporaryPassword?: string | null;
    };
    if (!response.ok || !json.success || !json.user) {
      setError(json.error ?? "Failed to generate password");
      setIsLoading(false);
      return;
    }

    setUsers(prev => prev.map(entry => (entry.id === user.id ? json.user! : entry)));
    setGeneratedPasswordByUserId(prev => ({
      ...prev,
      [user.id]: json.generatedTemporaryPassword ?? null
    }));
    setNotice("Temporary password generated.");
    setIsLoading(false);
  }

  async function handleSetDirectPassword() {
    if (!editingUserId || !editDraft || !editDraft.directPassword.trim()) {
      setError("Enter a password with at least 8 characters.");
      return;
    }
    setIsLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${editingUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passwordAction: "set",
        password: editDraft.directPassword.trim()
      })
    });
    const json = (await response.json()) as { success: boolean; error?: string; user?: ManagedUser };
    if (!response.ok || !json.success || !json.user) {
      setError(json.error ?? "Failed to set password");
      setIsLoading(false);
      return;
    }

    setUsers(prev => prev.map(entry => (entry.id === editingUserId ? json.user! : entry)));
    setEditDraft(prev => (prev ? { ...prev, directPassword: "" } : prev));
    setNotice("Password updated.");
    setIsLoading(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsLoading(true);
    setError(null);
    const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
      method: "DELETE"
    });
    const json = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !json.success) {
      setError(json.error ?? "Failed to delete user");
      setIsLoading(false);
      return;
    }

    setUsers(prev => prev.filter(user => user.id !== deleteTarget.id));
    setDeleteTarget(null);
    setNotice("User deleted.");
    setIsLoading(false);
  }

  function updatePermissionList(
    source: ModulePermissionKey[],
    permission: ModulePermissionKey,
    selected: boolean
  ) {
    if (selected) {
      return source.includes(permission) ? source : [...source, permission];
    }
    return source.filter(item => item !== permission);
  }

  return (
    <section className="space-y-6">
      <header className="admin-content-card">
        <h1 className="text-2xl font-bold text-slate-900">User & Role Governance</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage staff roles and access across timetable, visitor, incidents, appointments, staff attendance,
          and principal timetable workflows.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {createdTempPassword && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          New temporary password: <span className="font-semibold">{createdTempPassword}</span>
        </p>
      )}

      <section className="admin-content-card space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Create user</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Full name</span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={createDraft.fullName}
              onChange={event => setCreateDraft(prev => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              type="email"
              value={createDraft.email}
              onChange={event => setCreateDraft(prev => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Role</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={createDraft.role}
              onChange={event => {
                const role = event.target.value as AppRole;
                setCreateDraft(prev => ({
                  ...prev,
                  role,
                  teachingSubject: role === "TEACHER" ? prev.teachingSubject : "",
                  modulePermissions: [...DEFAULT_ROLE_MODULE_PERMISSIONS[role]]
                }));
              }}
            >
              {APP_ROLES.map(role => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={createDraft.isActive ? "active" : "inactive"}
              onChange={event =>
                setCreateDraft(prev => ({ ...prev, isActive: event.target.value === "active" }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {createDraft.role === "TEACHER" && (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Teacher Subject</span>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                maxLength={120}
                value={createDraft.teachingSubject}
                onChange={event =>
                  setCreateDraft(prev => ({ ...prev, teachingSubject: event.target.value }))
                }
              />
            </label>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Password setup</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                checked={createDraft.passwordMode === "generate"}
                type="radio"
                onChange={() => setCreateDraft(prev => ({ ...prev, passwordMode: "generate", password: "" }))}
              />
              <span>Generate secure temporary password</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                checked={createDraft.passwordMode === "set"}
                type="radio"
                onChange={() => setCreateDraft(prev => ({ ...prev, passwordMode: "set" }))}
              />
              <span>Set password directly</span>
            </label>
          </div>
          {createDraft.passwordMode === "set" && (
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Minimum 8 characters"
              type="password"
              value={createDraft.password}
              onChange={event => setCreateDraft(prev => ({ ...prev, password: event.target.value }))}
            />
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Module permissions</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {MODULE_PERMISSION_KEYS.map(permission => {
              const checked = createDraft.modulePermissions.includes(permission);
              return (
                <label
                  key={permission}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="flex items-start gap-2">
                    <input
                      checked={checked}
                      type="checkbox"
                      onChange={event =>
                        setCreateDraft(prev => ({
                          ...prev,
                          modulePermissions: updatePermissionList(
                            prev.modulePermissions,
                            permission,
                            event.target.checked
                          )
                        }))
                      }
                    />
                    <span>
                      <span className="block font-medium text-slate-800">
                        {MODULE_PERMISSION_LABELS[permission]}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {MODULE_PERMISSION_DESCRIPTIONS[permission]}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={isLoading}
            type="button"
            onClick={handleCreateUser}
          >
            Create user
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            disabled={isLoading}
            type="button"
            onClick={refreshUsers}
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="admin-content-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Managed users</h2>
          <span className="text-sm text-slate-500">{sortedUsers.length} users</span>
        </div>

        <div className="space-y-4">
          {sortedUsers.map(user => {
            const isEditing = editingUserId === user.id;
            const draft = isEditing ? editDraft : null;
            return (
              <article key={user.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{user.fullName}</h3>
                    <p className="text-sm text-slate-600">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ROLE_LABELS[user.role]} • {user.isActive ? "Active" : "Inactive"}
                    </p>
                    {user.role === "TEACHER" && user.teachingSubject && (
                      <p className="mt-1 text-xs text-slate-500">Subject: {user.teachingSubject}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                      disabled={isLoading}
                      type="button"
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? "Set inactive" : "Set active"}
                    </button>
                    <button
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
                      disabled={isLoading}
                      type="button"
                      onClick={() => handleGeneratePassword(user)}
                    >
                      Generate temp password
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                      type="button"
                      onClick={() => {
                        setEditingUserId(user.id);
                        setEditDraft(toEditableUserState(user));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {user.modulePermissions.map(permission => (
                    <span
                      key={`${user.id}-${permission}`}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                    >
                      {MODULE_PERMISSION_LABELS[permission]}
                    </span>
                  ))}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  <p>Last login: {formatDate(user.lastLoginAt)}</p>
                  <p>Password updated: {formatDate(user.passwordUpdatedAt)}</p>
                  <p>
                    Temp password issued: {formatDate(user.tempPasswordIssuedAt)} • Must change password:{" "}
                    {user.mustChangePassword ? "Yes" : "No"}
                  </p>
                </div>

                {generatedPasswordByUserId[user.id] && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Generated password for {user.fullName}:{" "}
                    <span className="font-semibold">{generatedPasswordByUserId[user.id]}</span>
                  </p>
                )}

                {isEditing && draft && (
                  <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Full name</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          value={draft.fullName}
                          onChange={event =>
                            setEditDraft(prev => (prev ? { ...prev, fullName: event.target.value } : prev))
                          }
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Email</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          type="email"
                          value={draft.email}
                          onChange={event =>
                            setEditDraft(prev => (prev ? { ...prev, email: event.target.value } : prev))
                          }
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Role</span>
                        <select
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          value={draft.role}
                          onChange={event => {
                            const role = event.target.value as AppRole;
                            setEditDraft(prev =>
                              prev
                                ? {
                                    ...prev,
                                    role,
                                    teachingSubject: role === "TEACHER" ? prev.teachingSubject : "",
                                    modulePermissions: [...DEFAULT_ROLE_MODULE_PERMISSIONS[role]]
                                  }
                                : prev
                            );
                          }}
                        >
                          {APP_ROLES.map(role => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">Status</span>
                        <select
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          value={draft.isActive ? "active" : "inactive"}
                          onChange={event =>
                            setEditDraft(prev =>
                              prev ? { ...prev, isActive: event.target.value === "active" } : prev
                            )
                          }
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                      {draft.role === "TEACHER" && (
                        <label className="space-y-1 text-sm">
                          <span className="font-medium text-slate-700">Teacher Subject</span>
                          <input
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                            maxLength={120}
                            value={draft.teachingSubject}
                            onChange={event =>
                              setEditDraft(prev =>
                                prev ? { ...prev, teachingSubject: event.target.value } : prev
                              )
                            }
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Module permissions</p>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {MODULE_PERMISSION_KEYS.map(permission => (
                          <label
                            key={`${user.id}-edit-${permission}`}
                            className="inline-flex items-center gap-2 text-sm"
                          >
                            <input
                              checked={draft.modulePermissions.includes(permission)}
                              type="checkbox"
                              onChange={event =>
                                setEditDraft(prev =>
                                  prev
                                    ? {
                                        ...prev,
                                        modulePermissions: updatePermissionList(
                                          prev.modulePermissions,
                                          permission,
                                          event.target.checked
                                        )
                                      }
                                    : prev
                                )
                              }
                            />
                            <span>{MODULE_PERMISSION_LABELS[permission]}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Direct password reset</p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          className="min-w-[280px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Set new password (min 8 chars)"
                          type="password"
                          value={draft.directPassword}
                          onChange={event =>
                            setEditDraft(prev =>
                              prev ? { ...prev, directPassword: event.target.value } : prev
                            )
                          }
                        />
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                          disabled={isLoading}
                          type="button"
                          onClick={handleSetDirectPassword}
                        >
                          Set password
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        disabled={isLoading}
                        type="button"
                        onClick={handleSaveUser}
                      >
                        Save changes
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                        type="button"
                        onClick={() => {
                          setEditingUserId(null);
                          setEditDraft(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm delete</h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <span className="font-medium">{deleteTarget.fullName}</span> ({deleteTarget.email})? This
              action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                type="button"
                onClick={handleConfirmDelete}
              >
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

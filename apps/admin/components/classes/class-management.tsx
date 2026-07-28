"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campus {
  id: string;
  code: string;
  name: string;
  isMain: boolean;
}

interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: string;
  campusId: string;
  campus: { name: string };
  _count: { students: number };
}

// ─── Grade level options ───────────────────────────────────────────────────────

const GRADE_LEVELS = [
  "Nursery",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
];

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  navy: "#1a2b4a",
  navyLight: "#233a61",
  gold: "#c9972c",
  goldHover: "#b5841f",
  border: "#d1d5db",
  offWhite: "#f8f9fa",
  textMuted: "#6b7280",
  red: "#dc2626",
  redBg: "#fee2e2",
  redBorder: "#fca5a5",
  green: "#065f46",
  greenBg: "#d1fae5",
  greenBorder: "#6ee7b7",
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ClassManagement() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create class form state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createGrade, setCreateGrade] = useState(GRADE_LEVELS[0]);
  const [createCampus, setCreateCampus] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Campus creation inline form
  const [showCampusForm, setShowCampusForm] = useState(false);
  const [campusName, setCampusName] = useState("");
  const [campusCode, setCampusCode] = useState("");
  const [creatingCampus, setCreatingCampus] = useState(false);

  const flash = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, cp] = await Promise.all([
        fetch("/api/classes").then((r) => r.json()),
        fetch("/api/campuses").then((r) => r.json()),
      ]);
      setClasses(cr.classes ?? []);
      setCampuses(cp.campuses ?? []);
      if (cp.campuses?.length > 0 && !createCampus) {
        setCreateCampus(cp.campuses[0].id);
      }
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Create Campus ──────────────────────────────────────────────────────────

  const handleCreateCampus = async () => {
    if (!campusName.trim() || !campusCode.trim()) {
      flash("Campus name and code are required.", true);
      return;
    }
    setCreatingCampus(true);
    try {
      const res = await fetch("/api/campuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campusName.trim(), code: campusCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Failed to create campus.", true);
        return;
      }
      setCampuses((prev) => [...prev, data.campus]);
      setCreateCampus(data.campus.id);
      setCampusName("");
      setCampusCode("");
      setShowCampusForm(false);
      flash(`Campus "${data.campus.name}" created.`);
    } catch {
      flash("Failed to create campus.", true);
    } finally {
      setCreatingCampus(false);
    }
  };

  // ── Create Class ───────────────────────────────────────────────────────────

  const handleCreateClass = async () => {
    if (!createName.trim()) {
      flash("Class name is required.", true);
      return;
    }
    if (!createCampus) {
      flash("Select a campus first.", true);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          gradeLevel: createGrade,
          campusId: createCampus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Failed to create class.", true);
        return;
      }
      setClasses((prev) =>
        [...prev, data.schoolClass].sort((a, b) =>
          a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name)
        )
      );
      setCreateName("");
      setCreateGrade(GRADE_LEVELS[0]);
      setShowCreate(false);
      flash(`Class "${data.schoolClass.name}" created.`);
    } catch {
      flash("Failed to create class.", true);
    } finally {
      setCreating(false);
    }
  };

  // ── Edit Class ─────────────────────────────────────────────────────────────

  const startEdit = (cls: SchoolClass) => {
    setEditId(cls.id);
    setEditName(cls.name);
    setEditGrade(cls.gradeLevel);
    setDeleteId(null);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    if (!editName.trim()) {
      flash("Class name is required.", true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), gradeLevel: editGrade }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Failed to update class.", true);
        return;
      }
      setClasses((prev) =>
        prev
          .map((c) => (c.id === editId ? data.schoolClass : c))
          .sort((a, b) =>
            a.gradeLevel.localeCompare(b.gradeLevel) || a.name.localeCompare(b.name)
          )
      );
      setEditId(null);
      flash("Class updated.");
    } catch {
      flash("Failed to update class.", true);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Class ───────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? "Failed to delete class.", true);
        setDeleteId(null);
        return;
      }
      setClasses((prev) => prev.filter((c) => c.id !== id));
      setDeleteId(null);
      flash("Class deleted.");
    } catch {
      flash("Failed to delete class.", true);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: C.navy, margin: 0 }}>
            Class Management
          </h1>
          <p style={{ color: C.textMuted, fontSize: "0.875rem", marginTop: 4 }}>
            Manage school classes and campus structure
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate((v) => !v);
            setEditId(null);
            setDeleteId(null);
          }}
          style={primaryBtn}
        >
          {showCreate ? "Cancel" : "+ Add Class"}
        </button>
      </div>

      {/* Flash messages */}
      {error && (
        <div style={alertBox(C.red, C.redBg, C.redBorder)}>{error}</div>
      )}
      {success && (
        <div style={alertBox(C.green, C.greenBg, C.greenBorder)}>{success}</div>
      )}

      {/* Create Class form */}
      {showCreate && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: C.navy, marginBottom: "1rem" }}>
            New Class
          </h2>

          {/* Campus picker / creation */}
          <div style={fieldRow}>
            <label style={labelStyle}>Campus *</label>
            {campuses.length === 0 ? (
              <div>
                <p style={{ color: C.red, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                  No campuses exist. Create one first:
                </p>
                {!showCampusForm ? (
                  <button
                    onClick={() => setShowCampusForm(true)}
                    style={{ ...secondaryBtn, fontSize: "0.8rem" }}
                  >
                    + Create Campus
                  </button>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end" }}>
                    <input
                      placeholder="Campus name (e.g. Main Campus)"
                      value={campusName}
                      onChange={(e) => setCampusName(e.target.value)}
                      style={{ ...inputStyle, minWidth: 200 }}
                    />
                    <input
                      placeholder="Code (e.g. MAIN)"
                      value={campusCode}
                      onChange={(e) => setCampusCode(e.target.value.toUpperCase())}
                      style={{ ...inputStyle, minWidth: 100, maxWidth: 120 }}
                    />
                    <button
                      onClick={handleCreateCampus}
                      disabled={creatingCampus}
                      style={{ ...primaryBtn, opacity: creatingCampus ? 0.6 : 1 }}
                    >
                      {creatingCampus ? "Saving…" : "Save Campus"}
                    </button>
                    <button onClick={() => setShowCampusForm(false)} style={secondaryBtn}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select
                  value={createCampus}
                  onChange={(e) => setCreateCampus(e.target.value)}
                  style={inputStyle}
                >
                  {campuses.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} ({cp.code})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowCampusForm((v) => !v)}
                  style={{ ...secondaryBtn, fontSize: "0.75rem" }}
                  title="Add another campus"
                >
                  + Campus
                </button>
              </div>
            )}
            {showCampusForm && campuses.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.5rem" }}>
                <input
                  placeholder="Campus name"
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  style={{ ...inputStyle, minWidth: 200 }}
                />
                <input
                  placeholder="Code (e.g. MAIN)"
                  value={campusCode}
                  onChange={(e) => setCampusCode(e.target.value.toUpperCase())}
                  style={{ ...inputStyle, minWidth: 100, maxWidth: 120 }}
                />
                <button
                  onClick={handleCreateCampus}
                  disabled={creatingCampus}
                  style={{ ...primaryBtn, opacity: creatingCampus ? 0.6 : 1 }}
                >
                  {creatingCampus ? "Saving…" : "Save Campus"}
                </button>
                <button onClick={() => setShowCampusForm(false)} style={secondaryBtn}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div style={fieldRow}>
            <label style={labelStyle}>Class Name *</label>
            <input
              placeholder='e.g. "7A" or "Grade 8 Science"'
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldRow}>
            <label style={labelStyle}>Grade Level *</label>
            <select
              value={createGrade}
              onChange={(e) => setCreateGrade(e.target.value)}
              style={inputStyle}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleCreateClass}
              disabled={creating || campuses.length === 0}
              style={{
                ...primaryBtn,
                opacity: creating || campuses.length === 0 ? 0.6 : 1,
                cursor: creating || campuses.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {creating ? "Creating…" : "Create Class"}
            </button>
            <button onClick={() => setShowCreate(false)} style={secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Classes Table */}
      {loading ? (
        <p style={{ color: C.textMuted, padding: "2rem 0" }}>Loading…</p>
      ) : classes.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            background: C.offWhite,
            borderRadius: 8,
            border: `1px dashed ${C.border}`,
            color: C.textMuted,
          }}
        >
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>No classes yet.</p>
          <p style={{ fontSize: "0.875rem" }}>
            Add your first class to get started.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: C.navyLight, color: "#fff" }}>
                <th style={thStyle}>Class Name</th>
                <th style={thStyle}>Grade Level</th>
                <th style={thStyle}>Campus</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Students</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, idx) => (
                <tr
                  key={cls.id}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : C.offWhite,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {editId === cls.id ? (
                    <>
                      <td style={tdStyle}>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ ...inputStyle, minWidth: 120 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          style={inputStyle}
                        >
                          {GRADE_LEVELS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>{cls.campus.name}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <StudentBadge count={cls._count.students} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            style={{ ...smallPrimaryBtn, opacity: saving ? 0.6 : 1 }}
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setEditId(null)} style={smallSecondaryBtn}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : deleteId === cls.id ? (
                    <>
                      <td colSpan={4} style={{ ...tdStyle, color: C.red, fontWeight: 600 }}>
                        Delete &quot;{cls.name}&quot;?{" "}
                        {cls._count.students > 0 && (
                          <span style={{ fontWeight: 400, fontSize: "0.875rem" }}>
                            ({cls._count.students} student{cls._count.students !== 1 ? "s" : ""} enrolled — cannot delete)
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          {cls._count.students === 0 && (
                            <button
                              onClick={() => handleDelete(cls.id)}
                              disabled={deleting}
                              style={{
                                ...smallPrimaryBtn,
                                background: C.red,
                                opacity: deleting ? 0.6 : 1,
                              }}
                            >
                              {deleting ? "Deleting…" : "Confirm Delete"}
                            </button>
                          )}
                          <button onClick={() => setDeleteId(null)} style={smallSecondaryBtn}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{cls.name}</td>
                      <td style={tdStyle}>{cls.gradeLevel}</td>
                      <td style={tdStyle}>{cls.campus.name}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <StudentBadge count={cls._count.students} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => startEdit(cls)}
                            style={smallSecondaryBtn}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(cls.id);
                              setEditId(null);
                            }}
                            style={{ ...smallSecondaryBtn, color: C.red, borderColor: C.red }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StudentBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.55rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
        background: count > 0 ? "#dbeafe" : "#f3f4f6",
        color: count > 0 ? "#1d4ed8" : "#6b7280",
        border: `1px solid ${count > 0 ? "#93c5fd" : "#d1d5db"}`,
      }}
    >
      {count}
    </span>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

function alertBox(color: string, bg: string, border: string): React.CSSProperties {
  return {
    color,
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 6,
    padding: "0.5rem 0.75rem",
    marginBottom: "1rem",
    fontSize: "0.875rem",
  };
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "1.25rem 1.5rem",
  marginBottom: "1.5rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const fieldRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  marginBottom: "0.75rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: C.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  background: "#fff",
  minWidth: 180,
};

const primaryBtn: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  background: C.gold,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  background: "#fff",
  color: C.navy,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

const smallPrimaryBtn: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  background: C.gold,
  color: "#fff",
  border: "none",
  borderRadius: 5,
  fontSize: "0.775rem",
  fontWeight: 700,
  cursor: "pointer",
};

const smallSecondaryBtn: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  background: "#fff",
  color: C.navy,
  border: `1px solid ${C.border}`,
  borderRadius: 5,
  fontSize: "0.775rem",
  fontWeight: 600,
  cursor: "pointer",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "0.775rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  verticalAlign: "middle",
};

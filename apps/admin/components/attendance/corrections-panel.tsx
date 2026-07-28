"use client";

import { useState, useEffect } from "react";
import {
  BRAND,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/attendance";
import type { AttendanceStatus } from "@/lib/attendance";

function safeStatusColor(status: string) {
  const s = status as AttendanceStatus;
  return STATUS_COLORS[s] ?? { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
}

function safeStatusLabel(status: string) {
  const s = status as AttendanceStatus;
  return STATUS_LABELS[s] ?? status;
}

interface Correction {
  id: string;
  status: string;
  reason: string;
  originalStatus: string;
  newStatus: string;
  createdAt: string;
  reviewedAt: string | null;
  record: {
    date: string;
    student: { studentCode: string; firstName: string; lastName: string };
    class: { name: string };
  };
  requestedBy: { fullName: string; email: string };
  approvedBy: { fullName: string; email: string } | null;
}

interface Props {
  canApprove: boolean;
}

export default function CorrectionsPanel({ canApprove }: Props) {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "">("PENDING");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCorrections = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filter ? `?status=${filter}` : "";
      const res = await fetch(`/api/attendance/corrections${q}`);
      const data = await res.json();
      setCorrections(data.corrections ?? []);
    } catch {
      setError("Failed to load corrections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCorrections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      await loadCorrections();
    } catch {
      setError("Failed to process correction");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      PENDING: { bg: "#fef3c7", color: "#92400e" },
      APPROVED: { bg: "#d1fae5", color: "#065f46" },
      REJECTED: { bg: "#fee2e2", color: "#991b1b" },
    };
    const c = map[status] ?? { bg: "#f3f4f6", color: "#374151" };
    return (
      <span style={{ ...badgeStyle, background: c.bg, color: c.color }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.35rem 0.9rem",
              borderRadius: 20,
              border: `1px solid ${filter === f ? BRAND.gold : BRAND.border}`,
              background: filter === f ? BRAND.gold : "#fff",
              color: filter === f ? "#fff" : BRAND.textDark,
              fontWeight: filter === f ? 700 : 400,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {f === "" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "0.5rem 0.75rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: BRAND.textMuted }}>Loading correctionsأ¢â‚¬آ¦</p>
      ) : corrections.length === 0 ? (
        <p style={{ color: BRAND.textMuted }}>No correction requests found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: BRAND.navyLight, color: "#fff" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Student</th>
                <th style={thStyle}>Class</th>
                <th style={thStyle}>Change</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Requested By</th>
                <th style={thStyle}>Status</th>
                {canApprove && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {corrections.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    background: idx % 2 === 0 ? BRAND.white : BRAND.offWhite,
                    borderBottom: `1px solid ${BRAND.border}`,
                  }}
                >
                  <td style={tdStyle}>{new Date(c.record.date).toLocaleDateString("en-KE")}</td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>
                    {c.record.student.lastName}, {c.record.student.firstName}
                    <br />
                    <span style={{ fontSize: "0.75rem", color: BRAND.textMuted, fontFamily: "monospace" }}>
                      {c.record.student.studentCode}
                    </span>
                  </td>
                  <td style={tdStyle}>{c.record.class.name}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badgeStyle, background: safeStatusColor(c.originalStatus).bg, color: safeStatusColor(c.originalStatus).text }}>
                      {safeStatusLabel(c.originalStatus)}
                    </span>
                    {" أ¢â€ â€™ "}
                    <span style={{ ...badgeStyle, background: safeStatusColor(c.newStatus).bg, color: safeStatusColor(c.newStatus).text }}>
                      {safeStatusLabel(c.newStatus)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 200, wordBreak: "break-word" }}>{c.reason}</td>
                  <td style={tdStyle}>{c.requestedBy.fullName}</td>
                  <td style={tdStyle}>{statusBadge(c.status)}</td>
                  {canApprove && (
                    <td style={tdStyle}>
                      {c.status === "PENDING" ? (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => handleAction(c.id, "approve")}
                            disabled={actionLoading === c.id}
                            style={{ ...actionBtn, background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(c.id, "reject")}
                            disabled={actionLoading === c.id}
                            style={{ ...actionBtn, background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: BRAND.textMuted }}>
                          {c.approvedBy ? `By ${c.approvedBy.fullName}` : "أ¢â‚¬â€‌"}
                        </span>
                      )}
                    </td>
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

// أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ Styles أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.5rem",
  borderRadius: 999,
  fontSize: "0.7rem",
  fontWeight: 700,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.875rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 8,
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "0.75rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  verticalAlign: "middle",
};

const actionBtn: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  borderRadius: 4,
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
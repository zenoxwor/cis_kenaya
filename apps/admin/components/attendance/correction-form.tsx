"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@/types/auth";
import { ATTENDANCE_STATUSES, STATUS_LABELS, BRAND } from "@/lib/attendance";

interface CorrectionFormProps {
  recordId: string;
  currentStatus: AttendanceStatus;
  studentName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CorrectionForm({
  recordId,
  currentStatus,
  studentName,
  onSuccess,
  onCancel,
}: CorrectionFormProps) {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(
    ATTENDANCE_STATUSES.find((s) => s !== currentStatus) ?? "PRESENT"
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("Please provide a more detailed reason.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, reason: reason.trim(), newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Request failed");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: "0 0 0.75rem", color: BRAND.textDark, fontSize: "1rem" }}>
          Request Attendance Correction
        </h3>
        <p style={{ margin: "0 0 1rem", color: BRAND.textMuted, fontSize: "0.875rem" }}>
          Student: <strong>{studentName}</strong> &nbsp;·&nbsp; Current status:{" "}
          <strong>{STATUS_LABELS[currentStatus]}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
              style={selectStyle}
            >
              {ATTENDANCE_STATUSES.filter((s) => s !== currentStatus).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Reason for Correction</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this correction is needed…"
              rows={3}
              style={textareaStyle}
            />
          </div>

          {error && (
            <p style={{ color: "#991b1b", fontSize: "0.8rem", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onCancel} style={cancelBtnStyle}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ ...submitBtnStyle, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "1rem",
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: "1.5rem",
  width: "100%",
  maxWidth: 440,
  boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: BRAND.textMuted,
  marginBottom: "0.25rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  background: "#fff",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  resize: "vertical",
  boxSizing: "border-box",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 6,
  fontSize: "0.875rem",
  cursor: "pointer",
  background: "#fff",
  color: BRAND.textDark,
};

const submitBtnStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  background: BRAND.gold,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
};
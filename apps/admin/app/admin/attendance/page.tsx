import { requireRole, canMarkAttendance, canApproveCorrections } from "@/lib/rbac";
import AttendanceCapture from "@/components/attendance/attendance-capture";
import CorrectionsPanel from "@/components/attendance/corrections-panel";
import type { Metadata } from "next";
import { BRAND } from "@/lib/attendance";

export const metadata: Metadata = {
  title: "Attendance — CIS Kenya Admin",
};

export default async function AttendancePage() {
  const user = await requireRole("reception");
  const userCanMark = canMarkAttendance(user.role);
  const userCanApprove = canApproveCorrections(user.role);

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", color: BRAND.textDark }}>
          Daily Attendance
        </h1>
        <p style={{ margin: 0, color: BRAND.textMuted, fontSize: "0.875rem" }}>
          Capital International School, Nairobi
          {!userCanMark && (
            <span style={{ marginLeft: "0.75rem", background: "#fef3c7", color: "#92400e", padding: "0.15rem 0.5rem", borderRadius: 4, fontSize: "0.75rem" }}>
              View only
            </span>
          )}
        </p>
      </div>

      <section style={cardStyle}>
        <AttendanceCapture canMark={userCanMark} />
      </section>

      {/* Corrections section — visible to all but actions only for approvers */}
      <section style={{ ...cardStyle, marginTop: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: BRAND.textDark }}>
            Correction Requests
          </h2>
          <p style={{ margin: "0.25rem 0 0", color: BRAND.textMuted, fontSize: "0.8rem" }}>
            {userCanApprove
              ? "Review and approve or reject staff correction requests."
              : "Submit a correction request for any record that needs adjustment."}
          </p>
        </div>
        <CorrectionsPanel canApprove={userCanApprove} />
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${BRAND.border}`,
  borderRadius: 10,
  padding: "1.5rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
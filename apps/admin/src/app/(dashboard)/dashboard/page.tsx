import { requireRole } from "@/lib/rbac";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — CIS Kenya Admin" };

export default async function DashboardPage() {
  const user = await requireRole("viewer");

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p>
        Welcome back, <strong>{user.username}</strong>. You are signed in as{" "}
        <strong>{user.role}</strong>.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        <StatCard label="Students" value="—" />
        <StatCard label="Pending Registrations" value="—" />
        <StatCard label="This Month" value="—" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: "1.25rem 1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "#C5A028" }}>{value}</div>
      <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

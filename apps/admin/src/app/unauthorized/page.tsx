import type { Metadata } from "next";

export const metadata: Metadata = { title: "Unauthorized — CIS Kenya Admin" };

export default function UnauthorizedPage() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f5f5f5",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          maxWidth: 360,
        }}
      >
        <h1 style={{ color: "#b00020", margin: "0 0 0.5rem" }}>403 — Forbidden</h1>
        <p style={{ color: "#555", margin: "0 0 1.5rem" }}>
          You do not have permission to access this page. Contact your administrator
          if you believe this is an error.
        </p>
        <a
          href="/dashboard"
          style={{
            color: "#C5A028",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </a>
      </div>
    </main>
  );
}

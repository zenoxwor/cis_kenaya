import { getSessionUser } from "@/lib/rbac";
import { SignOutButton } from "@/components/sign-out-button";

/** Protected layout wrapping all dashboard routes.
 *  requireRole is called per-page; this layout provides the chrome.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "#1a1a1a",
          color: "#fff",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>CIS Kenya Admin</span>
          {user && (
            <span
              style={{
                background: "#C5A028",
                color: "#fff",
                borderRadius: 4,
                padding: "0.15rem 0.5rem",
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {user.role}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user && (
            <span style={{ fontSize: "0.85rem", color: "#ccc" }}>
              {user.username}
            </span>
          )}
          <SignOutButton />
        </div>
      </header>

      <nav
        style={{
          background: "#242424",
          padding: "0 1.5rem",
          display: "flex",
          gap: "0.25rem",
        }}
      >
        <a href="/dashboard" style={navLink}>Dashboard</a>
        {user && (user.role === "reception" || user.role === "admin" || user.role === "principal" || user.role === "superadmin") && (
          <a href="/attendance" style={navLink}>Attendance</a>
        )}
        {user && (user.role === "admin" || user.role === "principal" || user.role === "superadmin") && (
          <a href="/attendance/reports" style={navLink}>Reports</a>
        )}
        {user && (user.role === "admin" || user.role === "superadmin") && (
          <a href="/students" style={navLink}>Students</a>
        )}
        {user?.role === "superadmin" && (
          <a href="/settings" style={navLink}>Settings</a>
        )}
      </nav>

      <main style={{ flex: 1, padding: "2rem 1.5rem" }}>{children}</main>
    </div>
  );
}

const navLink: React.CSSProperties = {
  color: "#ccc",
  textDecoration: "none",
  padding: "0.6rem 0.75rem",
  fontSize: "0.85rem",
  display: "block",
};

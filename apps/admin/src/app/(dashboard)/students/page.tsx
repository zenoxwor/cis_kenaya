import { requireRole } from "@/lib/rbac";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Students — CIS Kenya Admin" };

export default async function StudentsPage() {
  // Requires at least "admin" role; viewers are redirected to /unauthorized
  await requireRole("admin");

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Students</h1>
      <p style={{ color: "#666" }}>
        Student records will appear here once the data layer is connected.
      </p>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      style={{
        padding: "0.4rem 1rem",
        background: "transparent",
        border: "1px solid #ccc",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: "0.85rem",
        color: "#555",
      }}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}

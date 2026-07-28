"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LoginFormProps {
  isExternalAuth: boolean;
  authModeLabel: string;
}

export function LoginForm({ isExternalAuth, authModeLabel }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json();
        setError((data as { error?: string }).error ?? "Login failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>CIS Kenya — Admin</h1>
      <p style={styles.subtitle}>Sign in to continue</p>

      {isExternalAuth && (
        <div style={styles.notice}>
          <strong>External Auth Required</strong>
          <br />
          This system uses an external authentication provider. Use your organisation
          credentials to sign in. Contact your administrator if you need access.
        </div>
      )}

      {!isExternalAuth && (
        <div style={styles.devNotice}>
          ⚠️ Development mode — {authModeLabel}
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <label style={styles.label}>
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          style={styles.input}
        />
      </label>

      <label style={styles.label}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={styles.input}
        />
      </label>

      <button type="submit" disabled={loading} style={styles.button}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: 380,
    margin: "0 auto",
    padding: "2rem",
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
  },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#1a1a1a" },
  subtitle: { margin: 0, color: "#666", fontSize: "0.9rem" },
  notice: {
    background: "#f0f4ff",
    border: "1px solid #c5d3f5",
    borderRadius: 6,
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    color: "#2a4aad",
    lineHeight: 1.5,
  },
  devNotice: {
    background: "#fffbea",
    border: "1px solid #f0c040",
    borderRadius: 6,
    padding: "0.5rem 0.75rem",
    fontSize: "0.8rem",
    color: "#7a5400",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #f5c5c5",
    borderRadius: 6,
    padding: "0.5rem 0.75rem",
    fontSize: "0.85rem",
    color: "#b00020",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#333",
  },
  input: {
    padding: "0.6rem 0.75rem",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    padding: "0.75rem",
    background: "#C5A028",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
};

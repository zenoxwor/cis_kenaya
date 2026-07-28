import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { getAuthModeLabel, isExternalAuthRequired } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in — CIS Kenya Admin" };

export default function LoginPage() {
  const isExternalAuth = isExternalAuthRequired();
  const authModeLabel = getAuthModeLabel();

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
      <Suspense>
        <LoginForm isExternalAuth={isExternalAuth} authModeLabel={authModeLabel} />
      </Suspense>
    </main>
  );
}

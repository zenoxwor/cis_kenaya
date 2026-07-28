"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth/types";

type SessionContextValue = {
  user: SessionUser;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  user: SessionUser;
  children: React.ReactNode;
};

export function SessionProvider({ user, children }: SessionProviderProps) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

export function useCurrentSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useCurrentSession must be used within SessionProvider.");
  }

  return context.user;
}

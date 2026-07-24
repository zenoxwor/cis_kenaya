import { DEFAULT_APP_ROLE, type AppRole } from "@/lib/rbac/roles";

export type SessionUser = {
  id: string;
  fullName: string;
  role: AppRole;
};

// Placeholder until production auth is wired.
const MOCK_USER: SessionUser = {
  id: "user-seed-super-admin",
  fullName: "System Administrator",
  role: DEFAULT_APP_ROLE
};

export async function getCurrentUser(): Promise<SessionUser> {
  return MOCK_USER;
}

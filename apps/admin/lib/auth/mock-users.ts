import { ROLE } from "@/lib/rbac/roles";
import type { SessionUser } from "@/lib/auth/types";
import { DEFAULT_ROLE_MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";

export type MockAuthUser = SessionUser & {
  username: string;
  password: string;
};

export const MOCK_AUTH_USERS: MockAuthUser[] = [
  {
    id: "mock-super-admin",
    username: "superadmin",
    password: "admin123",
    email: "superadmin@kenya.local",
    fullName: "System Administrator",
    role: ROLE.SUPER_ADMIN,
    isActive: true,
    modulePermissions: DEFAULT_ROLE_MODULE_PERMISSIONS[ROLE.SUPER_ADMIN]
  }
];

export function findMockUserByCredentials(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  return (
    MOCK_AUTH_USERS.find(
      user => user.username.toLowerCase() === normalizedUsername && user.password === password
    ) ?? null
  );
}

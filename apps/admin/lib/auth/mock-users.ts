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
  },
  {
    id: "mock-principal",
    username: "principal",
    password: "admin123",
    email: "principal@kenya.local",
    fullName: "School Principal",
    role: ROLE.PRINCIPAL,
    isActive: true,
    modulePermissions: DEFAULT_ROLE_MODULE_PERMISSIONS[ROLE.PRINCIPAL]
  },
  {
    id: "mock-reception",
    username: "reception",
    password: "admin123",
    email: "reception@kenya.local",
    fullName: "Admissions Officer",
    role: ROLE.RECEPTION,
    isActive: true,
    modulePermissions: DEFAULT_ROLE_MODULE_PERMISSIONS[ROLE.RECEPTION]
  },
  {
    id: "mock-finance",
    username: "finance",
    password: "admin123",
    email: "finance@kenya.local",
    fullName: "Finance Officer",
    role: ROLE.FINANCE,
    isActive: true,
    modulePermissions: DEFAULT_ROLE_MODULE_PERMISSIONS[ROLE.FINANCE]
  },
  {
    id: "mock-teacher",
    username: "teacher",
    password: "admin123",
    email: "teacher@kenya.local",
    fullName: "Class Teacher",
    role: ROLE.TEACHER,
    isActive: true,
    modulePermissions: DEFAULT_ROLE_MODULE_PERMISSIONS[ROLE.TEACHER],
    assignedClassIds: ["grade-6-a"]
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

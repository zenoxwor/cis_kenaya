import { ROLE } from "@/lib/rbac/roles";
import type { SessionUser } from "@/lib/auth/types";

export const MOCK_AUTH_USERS: SessionUser[] = [
  {
    id: "mock-super-admin",
    email: "superadmin@kenaya.local",
    fullName: "System Administrator",
    role: ROLE.SUPER_ADMIN
  },
  {
    id: "mock-principal",
    email: "principal@kenaya.local",
    fullName: "School Principal",
    role: ROLE.PRINCIPAL
  },
  {
    id: "mock-reception",
    email: "reception@kenaya.local",
    fullName: "Admissions Officer",
    role: ROLE.RECEPTION
  },
  {
    id: "mock-finance",
    email: "finance@kenaya.local",
    fullName: "Finance Officer",
    role: ROLE.FINANCE
  }
];

export function findMockUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return MOCK_AUTH_USERS.find(user => user.email.toLowerCase() === normalized) ?? null;
}

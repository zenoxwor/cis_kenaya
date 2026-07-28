import type { AppRole } from "@/lib/rbac/roles";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  assignedClassIds?: string[];
};

export type AuthSessionPayload = {
  v: 1;
  user: SessionUser;
};

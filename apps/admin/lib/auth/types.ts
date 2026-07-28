import type { AppRole } from "@/lib/rbac/roles";
import type { ModulePermission } from "@/lib/rbac/module-permissions";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  permissions: ModulePermission[];
  isActive: boolean;
  assignedClassIds?: string[];
};

export type AuthSessionPayload = {
  v: 1;
  user: SessionUser;
};

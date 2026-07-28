import type { AppRole } from "@/lib/rbac/roles";
import type { ModulePermissionKey } from "@/lib/admin/module-permissions";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  modulePermissions: ModulePermissionKey[];
  assignedClassIds?: string[];
};

export type AuthSessionPayload = {
  v: 1;
  user: SessionUser;
};

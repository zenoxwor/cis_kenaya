export const STAFF_ACCOUNT_ROLES = ["Teacher", "Worker", "Staff"] as const;
export type StaffAccountRole = (typeof STAFF_ACCOUNT_ROLES)[number];

export const STAFF_ACCOUNT_STATUSES = ["Active", "Disabled"] as const;
export type StaffAccountStatus = (typeof STAFF_ACCOUNT_STATUSES)[number];

export type StaffAccountRecord = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: StaffAccountRole;
  status: StaffAccountStatus;
  temporaryPassword: string;
  createdAt: string;
  updatedAt: string;
};

import type { StaffAccountRecord } from "@/lib/staff-accounts/types";

const STORAGE_KEY = "kenaya.principal.staff-accounts";

const seededStaffAccounts: StaffAccountRecord[] = [
  {
    id: "staff-001",
    fullName: "Nadia Al-Hassan",
    username: "nadia.teacher",
    email: "nadia.teacher@kenaya.local",
    role: "Teacher",
    status: "Active",
    temporaryPassword: "teacher123",
    createdAt: "2026-07-24T07:40:00.000Z",
    updatedAt: "2026-07-24T07:40:00.000Z"
  },
  {
    id: "staff-002",
    fullName: "Farid Jaber",
    username: "farid.worker",
    email: "farid.worker@kenaya.local",
    role: "Worker",
    status: "Active",
    temporaryPassword: "worker123",
    createdAt: "2026-07-24T07:55:00.000Z",
    updatedAt: "2026-07-24T07:55:00.000Z"
  },
  {
    id: "staff-003",
    fullName: "Mona Youssef",
    username: "mona.staff",
    email: "mona.staff@kenaya.local",
    role: "Staff",
    status: "Disabled",
    temporaryPassword: "staff123",
    createdAt: "2026-07-24T08:05:00.000Z",
    updatedAt: "2026-07-24T08:11:00.000Z"
  }
];

export interface StaffAccountsRepository {
  list(): Promise<StaffAccountRecord[]>;
  save(records: StaffAccountRecord[]): Promise<void>;
}

export class BrowserStaffAccountsRepository implements StaffAccountsRepository {
  async list() {
    if (typeof window === "undefined") {
      return seededStaffAccounts;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seededStaffAccounts;
    }

    try {
      return JSON.parse(raw) as StaffAccountRecord[];
    } catch (error) {
      console.warn("Failed to parse staff accounts data.", error);
      return seededStaffAccounts;
    }
  }

  async save(records: StaffAccountRecord[]) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

export function createStaffAccountsRepository() {
  return new BrowserStaffAccountsRepository();
}

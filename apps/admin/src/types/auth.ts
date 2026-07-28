export type Role = "admin" | "superadmin" | "viewer";

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  /** ISO timestamp of when the session was created */
  createdAt: string;
}

export interface AdminSession {
  user?: SessionUser;
}

/** Auth modes */
export type AuthMode = "mock" | "external";

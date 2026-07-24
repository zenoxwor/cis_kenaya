export const AUTH_COOKIE_NAME = "kenya_admin_session";

export type AuthMode = "mock" | "external";

export function getAuthMode(): AuthMode {
  const configured = process.env.AUTH_MODE;
  if (configured === "mock" || configured === "external") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "external" : "mock";
}

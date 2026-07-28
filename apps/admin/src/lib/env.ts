/**
 * Validated environment configuration.
 *
 * Validation runs at module load time. In production, missing required vars
 * throw immediately rather than silently falling back to insecure defaults.
 *
 * Required vars:
 *   AUTH_SECRET       – 32+ character secret for iron-session cookie encryption
 *   AUTH_MODE         – "mock" (dev only) or "external"
 *
 * Required when AUTH_MODE=external:
 *   EXTERNAL_AUTH_URL – Base URL of the external auth provider
 *
 * Optional:
 *   MOCK_ADMIN_USERNAME  – Username for mock login (default: "admin")
 *   MOCK_ADMIN_PASSWORD  – Password for mock login (default: "admin123")
 *   SESSION_MAX_AGE_SECONDS – Cookie max-age in seconds (default: 28800 = 8 h)
 */

import { z } from "zod";

const isDev = process.env.NODE_ENV !== "production";

// ─── Base schema (all modes) ──────────────────────────────────────────────────
const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .describe("iron-session cookie encryption key"),

  AUTH_MODE: z
    .enum(["mock", "external"])
    .default(isDev ? "mock" : "external")
    .describe('Auth mode: "mock" for development only, "external" for production'),

  SESSION_MAX_AGE_SECONDS: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 8 * 60 * 60)) // default 8 h
    .pipe(z.number().positive()),
});

// ─── External-mode extras ─────────────────────────────────────────────────────
const externalSchema = z.object({
  EXTERNAL_AUTH_URL: z
    .string()
    .url("EXTERNAL_AUTH_URL must be a valid URL")
    .describe("Base URL for the external auth provider"),
});

// ─── Mock-mode extras (dev only) ──────────────────────────────────────────────
const mockSchema = z.object({
  MOCK_ADMIN_USERNAME: z.string().default("admin"),
  MOCK_ADMIN_PASSWORD: z.string().min(6, "MOCK_ADMIN_PASSWORD must be at least 6 characters").default("admin123"),
});

// ─── Parse & validate ─────────────────────────────────────────────────────────
function parseEnv() {
  const base = baseSchema.safeParse(process.env);
  if (!base.success) {
    const msgs = base.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`[admin] Missing or invalid environment variables:\n${msgs}`);
  }

  const { AUTH_MODE } = base.data;

  // Guard: mock mode must not run in production.
  // NEXT_PHASE=phase-production-build is set during `next build` — we skip this
  // check at build time because it runs in NODE_ENV=production but the build
  // environment may legitimately use different vars than the runtime.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (AUTH_MODE === "mock" && process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error(
      "[admin] AUTH_MODE=mock is not allowed in production. " +
        'Set AUTH_MODE=external and configure EXTERNAL_AUTH_URL.'
    );
  }

  if (AUTH_MODE === "external") {
    const ext = externalSchema.safeParse(process.env);
    if (!ext.success) {
      const msgs = ext.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n");
      throw new Error(`[admin] AUTH_MODE=external requires additional env vars:\n${msgs}`);
    }
    return { ...base.data, ...ext.data, MOCK_ADMIN_USERNAME: "admin", MOCK_ADMIN_PASSWORD: "" };
  }

  // Mock mode
  const mock = mockSchema.safeParse(process.env);
  if (!mock.success) {
    const msgs = mock.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`[admin] Invalid mock auth configuration:\n${msgs}`);
  }
  return { ...base.data, ...mock.data, EXTERNAL_AUTH_URL: "" };
}

export const env = parseEnv();

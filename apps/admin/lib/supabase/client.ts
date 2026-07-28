import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseStorageClient: SupabaseClient | null | undefined;
let warnedMissingSupabaseConfig = false;
let warnedMissingSiteUrl = false;

function normalizeUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSupabaseStorageClient() {
  if (supabaseStorageClient !== undefined) {
    return supabaseStorageClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    if (!warnedMissingSupabaseConfig) {
      console.warn(
        "SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY is missing. Supabase Storage operations are unavailable."
      );
      warnedMissingSupabaseConfig = true;
    }
    supabaseStorageClient = null;
    return supabaseStorageClient;
  }

  supabaseStorageClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseStorageClient;
}

export function getPublicSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    if (!warnedMissingSiteUrl) {
      console.warn(
        "NEXT_PUBLIC_SITE_URL is missing. Verification and public preregistration URLs cannot be generated."
      );
      warnedMissingSiteUrl = true;
    }
    return null;
  }

  return normalizeUrl(siteUrl);
}

import { NextRequest, NextResponse } from "next/server";
import { getPublicSiteUrl, getSupabaseServiceClient } from "@/lib/supabase/client";

type VerificationLookup = {
  id: string;
  first_name: string;
};

function buildRedirectUrl(request: NextRequest, status: "success" | "invalid" | "error", name?: string) {
  const baseUrl = getPublicSiteUrl() ?? request.nextUrl.origin;
  const redirectUrl = new URL("/registration-verified", baseUrl);
  redirectUrl.searchParams.set("status", status);
  if (name) {
    redirectUrl.searchParams.set("name", name);
  }
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  const { data, error } = await supabase
    .from("pre_registrations")
    .select("id, first_name")
    .eq("verification_token", token)
    .eq("status", "unverified")
    .single();

  if (error || !data) {
    return NextResponse.redirect(buildRedirectUrl(request, "invalid"));
  }

  const registration = data as VerificationLookup;

  const { error: updateError } = await supabase
    .from("pre_registrations")
    .update({ status: "verified" })
    .eq("id", registration.id)
    .eq("status", "unverified");

  if (updateError) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  return NextResponse.redirect(buildRedirectUrl(request, "success", registration.first_name));
}

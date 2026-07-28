import { NextRequest, NextResponse } from "next/server";
import { sendPreRegistrationVerificationEmail } from "@/lib/email/resend";
import { getPublicSiteUrl, getSupabaseServiceClient } from "@/lib/supabase/client";

type PreRegistrationRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  grade_level: string;
  curriculum: string;
  status: "unverified" | "verified";
  verification_token: string;
  created_at: string;
};

type CreatePreRegistrationPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  grade_level: string;
};

type ResendVerificationPayload = {
  action: "resend_verification";
  registration_id: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function withCors(response: NextResponse) {
  for (const [header, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return withCors(NextResponse.json(body, init));
}

function getFieldValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseCreatePayload(payload: unknown): CreatePreRegistrationPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const first_name = getFieldValue(record, "first_name");
  const last_name = getFieldValue(record, "last_name");
  const email = getFieldValue(record, "email");
  const phone = getFieldValue(record, "phone");
  const grade_level = getFieldValue(record, "grade_level");

  if (!first_name || !last_name || !email || !phone || !grade_level) {
    return null;
  }

  return { first_name, last_name, email, phone, grade_level };
}

function parseResendPayload(payload: unknown): ResendVerificationPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const action = getFieldValue(record, "action");
  const registration_id = getFieldValue(record, "registration_id");

  if (action !== "resend_verification" || !registration_id) {
    return null;
  }

  return { action: "resend_verification", registration_id };
}

function buildVerificationUrl(token: string) {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) {
    return null;
  }

  return `${siteUrl}/api/verify-email?token=${encodeURIComponent(token)}`;
}

function createUnavailableResponse() {
  return jsonWithCors(
    {
      success: false,
      message:
        "Pre-registration service is temporarily unavailable. Missing configuration: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SITE_URL."
    },
    { status: 503 }
  );
}

async function resendVerificationEmail(registrationId: string) {
  const supabase = getSupabaseServiceClient();
  const verificationUrlBase = getPublicSiteUrl();
  if (!supabase || !verificationUrlBase) {
    return createUnavailableResponse();
  }

  const { data, error } = await supabase
    .from("pre_registrations")
    .select(
      "id, first_name, last_name, email, phone, grade_level, curriculum, status, verification_token, created_at"
    )
    .eq("id", registrationId)
    .single();

  if (error || !data) {
    return jsonWithCors(
      {
        success: false,
        message: "Pre-registration not found."
      },
      { status: 404 }
    );
  }

  const registration = data as PreRegistrationRow;

  if (registration.status !== "unverified") {
    return jsonWithCors(
      {
        success: false,
        message: "Verification email can only be resent for unverified registrations."
      },
      { status: 400 }
    );
  }

  const verificationUrl = `${verificationUrlBase}/api/verify-email?token=${encodeURIComponent(
    registration.verification_token
  )}`;
  const emailResult = await sendPreRegistrationVerificationEmail(
    registration.email,
    registration.first_name,
    verificationUrl
  );

  if (!emailResult.sent && !emailResult.skipped) {
    return jsonWithCors(
      {
        success: false,
        message: emailResult.errorMessage ?? "Failed to send verification email."
      },
      { status: 502 }
    );
  }

  return jsonWithCors({
    success: true,
    message: "Verification email sent."
  });
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return createUnavailableResponse();
  }

  const { data, error } = await supabase
    .from("pre_registrations")
    .select(
      "id, first_name, last_name, email, phone, grade_level, curriculum, status, verification_token, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return jsonWithCors(
      {
        success: false,
        message: "Failed to load pre-registrations.",
        error: error.message
      },
      { status: 500 }
    );
  }

  return jsonWithCors({
    success: true,
    data: (data ?? []) as PreRegistrationRow[]
  });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonWithCors(
      {
        success: false,
        message: "Invalid JSON body."
      },
      { status: 400 }
    );
  }

  const resendPayload = parseResendPayload(payload);
  if (resendPayload) {
    return resendVerificationEmail(resendPayload.registration_id);
  }

  const body = parseCreatePayload(payload);
  if (!body) {
    return jsonWithCors(
      {
        success: false,
        message: "first_name, last_name, email, phone, and grade_level are required."
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase || !getPublicSiteUrl()) {
    return createUnavailableResponse();
  }

  const { data, error } = await supabase
    .from("pre_registrations")
    .insert({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      grade_level: body.grade_level,
      status: "unverified",
      curriculum: "Cambridge"
    })
    .select(
      "id, first_name, last_name, email, phone, grade_level, curriculum, status, verification_token, created_at"
    )
    .single();

  if (error || !data) {
    return jsonWithCors(
      {
        success: false,
        message: "Failed to submit registration.",
        error: error?.message
      },
      { status: 500 }
    );
  }

  const createdRegistration = data as PreRegistrationRow;

  const emailVerificationUrl = buildVerificationUrl(createdRegistration.verification_token);
  if (!emailVerificationUrl) {
    return createUnavailableResponse();
  }

  void sendPreRegistrationVerificationEmail(
    createdRegistration.email,
    createdRegistration.first_name,
    emailVerificationUrl
  )
    .then(result => {
      if (!result.sent) {
        const status = result.skipped ? "skipped" : "failed";
        console.warn(
          `Pre-registration verification email ${status} for ${createdRegistration.email}: ${result.errorMessage ?? "no details"}`
        );
      }
    })
    .catch(error => {
      const message = error instanceof Error ? error.message : "Unknown email error.";
      console.error(
        `Pre-registration verification email dispatch failed for ${createdRegistration.email}. ${message}`
      );
    });

  return jsonWithCors({
    success: true,
    message: "Registration submitted. Check your email."
  });
}

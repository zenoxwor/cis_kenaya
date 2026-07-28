import { NextRequest, NextResponse } from "next/server";
import { sendPreRegistrationVerificationEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/db/client";
import { getPublicSiteUrl } from "@/lib/supabase/client";

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
  const first_name = getFieldValue(record, "first_name") || getFieldValue(record, "firstName");
  const last_name = getFieldValue(record, "last_name") || getFieldValue(record, "lastName");
  const email = getFieldValue(record, "email");
  const phone = getFieldValue(record, "phone");
  const grade_level = getFieldValue(record, "grade_level") || getFieldValue(record, "gradeLevel");

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

function createUnavailableResponse(message: string) {
  return jsonWithCors(
    {
      success: false,
      message
    },
    { status: 503 }
  );
}

async function resendVerificationEmail(registrationId: string) {
  const verificationUrlBase = getPublicSiteUrl();
  if (!process.env.DATABASE_URL?.trim()) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: DATABASE_URL."
    );
  }
  if (!verificationUrlBase) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: NEXT_PUBLIC_SITE_URL."
    );
  }

  const registration = await prisma.preRegistration.findUnique({
    where: { id: registrationId }
  });
  if (!registration) {
    return jsonWithCors(
      {
        success: false,
        message: "Pre-registration not found."
      },
      { status: 404 }
    );
  }

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
    registration.verificationToken
  )}`;
  const emailResult = await sendPreRegistrationVerificationEmail(
    registration.email,
    registration.firstName,
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
  if (!process.env.DATABASE_URL?.trim()) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: DATABASE_URL."
    );
  }

  const data = await prisma.preRegistration.findMany({
    orderBy: { createdAt: "desc" }
  });

  return jsonWithCors({
    success: true,
    data: data.map(item => ({
      id: item.id,
      first_name: item.firstName,
      last_name: item.lastName,
      email: item.email,
      phone: item.phone,
      grade_level: item.gradeLevel,
      curriculum: item.curriculum,
      status: item.status,
      verification_token: item.verificationToken,
      created_at: item.createdAt
    }))
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

  if (!process.env.DATABASE_URL?.trim()) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: DATABASE_URL."
    );
  }
  if (!getPublicSiteUrl()) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: NEXT_PUBLIC_SITE_URL."
    );
  }

  const createdRegistration = await prisma.preRegistration.create({
    data: {
      firstName: body.first_name,
      lastName: body.last_name,
      email: body.email,
      phone: body.phone,
      gradeLevel: body.grade_level,
      curriculum: "Cambridge",
      status: "unverified"
    }
  });

  const emailVerificationUrl = buildVerificationUrl(createdRegistration.verificationToken);
  if (!emailVerificationUrl) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: NEXT_PUBLIC_SITE_URL."
    );
  }

  void sendPreRegistrationVerificationEmail(
    createdRegistration.email,
    createdRegistration.firstName,
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

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { sendPreRegistrationVerificationEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/db/client";
import { getPublicSiteUrl, getSupabaseStorageClient } from "@/lib/supabase/client";

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

type GetDocumentsPayload = {
  action: "get_documents";
  registration_id: string;
};

type DocumentFieldConfig = {
  formKey: string;
  documentType: string;
  label: string;
  fallbackFileName: string;
};

type UploadedDocument = {
  documentType: string;
  label: string;
  fileName: string;
  fileType: string;
  storagePath: string;
};

const STORAGE_BUCKET = "student-documents";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 30;

const DOCUMENT_FIELDS: DocumentFieldConfig[] = [
  {
    formKey: "birthCertificate",
    documentType: "birth_certificate",
    label: "Birth Certificate",
    fallbackFileName: "birth-cert"
  },
  {
    formKey: "nationalId",
    documentType: "national_id",
    label: "National ID",
    fallbackFileName: "national-id"
  },
  {
    formKey: "previousSchoolReport",
    documentType: "previous_school_report",
    label: "Previous School Report",
    fallbackFileName: "previous-school-report"
  }
];

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

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
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

function parseCreateFormData(formData: FormData): CreatePreRegistrationPayload | null {
  const first_name = getFormValue(formData, "first_name") || getFormValue(formData, "firstName");
  const last_name = getFormValue(formData, "last_name") || getFormValue(formData, "lastName");
  const email = getFormValue(formData, "email");
  const phone = getFormValue(formData, "phone");
  const grade_level = getFormValue(formData, "grade_level") || getFormValue(formData, "gradeLevel");

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

function parseGetDocumentsPayload(payload: unknown): GetDocumentsPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const action = getFieldValue(record, "action");
  const registration_id = getFieldValue(record, "registration_id");
  if (action !== "get_documents" || !registration_id) {
    return null;
  }

  return { action: "get_documents", registration_id };
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

function getFileExtension(fileName: string, mimeType: string) {
  const trimmedName = fileName.trim();
  const dotIndex = trimmedName.lastIndexOf(".");
  if (dotIndex > -1 && dotIndex < trimmedName.length - 1) {
    return trimmedName.slice(dotIndex + 1).toLowerCase();
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "bin";
}

function isSupportedDocumentFile(file: File) {
  if (!file.size) {
    return false;
  }

  const mimeType = file.type.toLowerCase();
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

function extractUploadFiles(formData: FormData) {
  return DOCUMENT_FIELDS.flatMap(config => {
    const fileValue = formData.get(config.formKey);
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return [];
    }

    if (!isSupportedDocumentFile(fileValue)) {
      throw new Error(`${config.label} must be a PDF or image file.`);
    }

    return [{ config, file: fileValue }];
  });
}

function readStoredDocuments(value: Prisma.JsonValue | null): UploadedDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const parsed: UploadedDocument[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const candidate = item as Record<string, unknown>;
    const documentType = typeof candidate.documentType === "string" ? candidate.documentType : "";
    const label = typeof candidate.label === "string" ? candidate.label : "";
    const fileName = typeof candidate.fileName === "string" ? candidate.fileName : "";
    const fileType = typeof candidate.fileType === "string" ? candidate.fileType : "";
    const storagePath = typeof candidate.storagePath === "string" ? candidate.storagePath : "";
    if (!documentType || !label || !fileName || !fileType || !storagePath) {
      continue;
    }

    parsed.push({ documentType, label, fileName, fileType, storagePath });
  }

  return parsed;
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

async function getDocumentsForRegistration(registrationId: string) {
  if (!process.env.DATABASE_URL?.trim()) {
    return createUnavailableResponse(
      "Pre-registration service is temporarily unavailable. Missing configuration: DATABASE_URL."
    );
  }

  const registration = await prisma.preRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true, documents: true }
  });
  if (!registration) {
    return jsonWithCors({ success: false, message: "Pre-registration not found." }, { status: 404 });
  }

  const documents = readStoredDocuments(registration.documents);
  if (documents.length === 0) {
    return jsonWithCors({ success: true, data: [] });
  }

  const supabase = getSupabaseStorageClient();
  if (!supabase) {
    return createUnavailableResponse(
      "Document retrieval is temporarily unavailable. Missing configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const signedDocuments = await Promise.all(
    documents.map(async document => {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(document.storagePath, SIGNED_URL_EXPIRY_SECONDS);
      return {
        ...document,
        signedUrl: error ? null : (data?.signedUrl ?? null),
        error: error?.message ?? null
      };
    })
  );

  return jsonWithCors({ success: true, data: signedDocuments });
}

async function createPreRegistration(
  payload: CreatePreRegistrationPayload,
  files: Array<{ config: DocumentFieldConfig; file: File }>
) {
  const createdRegistration = await prisma.preRegistration.create({
    data: {
      firstName: payload.first_name,
      lastName: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      gradeLevel: payload.grade_level,
      curriculum: "Cambridge",
      status: "unverified"
    }
  });

  let uploadedDocuments: UploadedDocument[] = [];
  if (files.length > 0) {
    const supabase = getSupabaseStorageClient();
    if (!supabase) {
      await prisma.preRegistration.delete({ where: { id: createdRegistration.id } });
      return createUnavailableResponse(
        "Document upload is temporarily unavailable. Missing configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const uploadedPaths: string[] = [];
    try {
      uploadedDocuments = await Promise.all(
        files.map(async ({ config, file }) => {
          const extension = getFileExtension(file.name, file.type);
          const fileName = `${config.fallbackFileName}.${extension}`;
          const storagePath = `${createdRegistration.id}/${fileName}`;

          const fileBuffer = Buffer.from(await file.arrayBuffer());
          const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true
          });
          if (error) {
            throw new Error(`Failed to upload ${config.label}. ${error.message}`);
          }
          uploadedPaths.push(storagePath);

          return {
            documentType: config.documentType,
            label: config.label,
            fileName: file.name || fileName,
            fileType: file.type || "application/octet-stream",
            storagePath
          };
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Document upload failed.";
      if (uploadedPaths.length > 0) {
        const { error: removeError } = await supabase.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
        if (removeError) {
          console.error("Failed to roll back uploaded pre-registration documents.", removeError.message);
        }
      }
      await prisma.preRegistration.delete({ where: { id: createdRegistration.id } });
      return jsonWithCors({ success: false, message: errorMessage }, { status: 500 });
    }

    await prisma.preRegistration.update({
      where: { id: createdRegistration.id },
      data: {
        documents: uploadedDocuments as Prisma.InputJsonValue
      }
    });
  }

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
    message: "Registration submitted. Check your email.",
    registration_id: createdRegistration.id,
    documents_uploaded: uploadedDocuments.length
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
      created_at: item.createdAt,
      documents: readStoredDocuments(item.documents),
      student_id: item.studentId ?? null
    }))
  });
}

export async function POST(request: NextRequest) {
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

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
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

    const getDocumentsPayload = parseGetDocumentsPayload(payload);
    if (getDocumentsPayload) {
      return getDocumentsForRegistration(getDocumentsPayload.registration_id);
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

    return createPreRegistration(body, []);
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body = parseCreateFormData(formData);
    if (!body) {
      return jsonWithCors(
        {
          success: false,
          message: "first_name, last_name, email, phone, and grade_level are required."
        },
        { status: 400 }
      );
    }

    let files: Array<{ config: DocumentFieldConfig; file: File }> = [];
    try {
      files = extractUploadFiles(formData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid document upload.";
      return jsonWithCors({ success: false, message }, { status: 400 });
    }

    return createPreRegistration(body, files);
  }

  return jsonWithCors(
    {
      success: false,
      message: "Unsupported content type. Use application/json or multipart/form-data."
    },
    { status: 415 }
  );
}

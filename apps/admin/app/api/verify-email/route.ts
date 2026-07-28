import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getPublicSiteUrl } from "@/lib/supabase/client";
import { generateStudentCode } from "@/lib/students/generate-student-code";
import type { PrismaClient } from "@prisma/client";

function buildRedirectUrl(request: NextRequest, status: "success" | "invalid" | "error", name?: string) {
  const baseUrl = getPublicSiteUrl() ?? request.nextUrl.origin;
  const redirectUrl = new URL("/registration-verified", baseUrl);
  redirectUrl.searchParams.set("status", status);
  if (name) {
    redirectUrl.searchParams.set("name", name);
  }
  return redirectUrl;
}

type UploadedDocument = {
  documentType: string;
  label: string;
  fileName: string;
  fileType: string;
  storagePath: string;
};

function parseDocuments(value: unknown): UploadedDocument[] {
  if (!Array.isArray(value)) return [];
  const result: UploadedDocument[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const documentType = typeof candidate.documentType === "string" ? candidate.documentType : "";
    const label = typeof candidate.label === "string" ? candidate.label : "";
    const fileName = typeof candidate.fileName === "string" ? candidate.fileName : "";
    const fileType = typeof candidate.fileType === "string" ? candidate.fileType : "";
    const storagePath = typeof candidate.storagePath === "string" ? candidate.storagePath : "";
    if (!documentType || !storagePath) continue;
    result.push({ documentType, label, fileName, fileType, storagePath });
  }
  return result;
}

function generateGuardianCode() {
  const seed = Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GRD-${date}-${seed}`;
}

async function createStudentFromRegistration(registrationId: string) {
  const registration = await prisma.preRegistration.findUnique({
    where: { id: registrationId }
  });
  if (!registration) return;

  if (registration.studentId) return;

  let campus = await prisma.campus.findFirst({ orderBy: { createdAt: "asc" } });
  if (!campus) {
    campus = await prisma.campus.create({
      data: { code: "MAIN", name: "Main Campus", isMain: true }
    });
  }

  const studentCode = await generateStudentCode(prisma as unknown as PrismaClient);

  const student = await prisma.student.create({
    data: {
      campusId: campus.id,
      studentCode,
      firstName: registration.firstName,
      lastName: registration.lastName,
      status: "PROSPECT",
      isActive: true
    }
  });

  if (registration.phone) {
    try {
      const guardian = await prisma.guardian.create({
        data: {
          campusId: campus.id,
          guardianCode: generateGuardianCode(),
          fullName: `${registration.firstName} ${registration.lastName} (Parent/Guardian)`,
          phoneNumber: registration.phone,
          email: registration.email
        }
      });
      await prisma.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          isPrimary: true
        }
      });
    } catch {
      // Non-fatal — student is already created
    }
  }

  const documents = parseDocuments(registration.documents);
  for (const doc of documents) {
    try {
      await prisma.studentDocument.create({
        data: {
          campusId: campus.id,
          studentId: student.id,
          documentType: doc.label || doc.documentType,
          status: "UPLOADED",
          fileName: doc.fileName || null,
          storagePath: doc.storagePath,
          uploadedAt: new Date()
        }
      });
    } catch {
      // Non-fatal — continue creating remaining documents
    }
  }

  await prisma.preRegistration.update({
    where: { id: registrationId },
    data: { studentId: student.id }
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  const registration = await prisma.preRegistration.findFirst({
    where: {
      verificationToken: token,
      status: "unverified"
    },
    select: {
      id: true,
      firstName: true
    }
  });

  if (!registration) {
    return NextResponse.redirect(buildRedirectUrl(request, "invalid"));
  }

  const updateResult = await prisma.preRegistration.updateMany({
    where: {
      id: registration.id,
      status: "unverified"
    },
    data: {
      status: "verified"
    }
  });

  if (updateResult.count === 0) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  void createStudentFromRegistration(registration.id).catch(error => {
    console.error("Failed to auto-create student from pre-registration:", error);
  });

  return NextResponse.redirect(buildRedirectUrl(request, "success", registration.firstName));
}

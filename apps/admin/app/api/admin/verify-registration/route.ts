import { Prisma, type PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import { prisma } from "@/lib/db/client";
import { sendRegistrationApprovedEmail } from "@/lib/email/resend";
import { ROLE } from "@/lib/rbac/roles";
import { getPublicSiteUrl } from "@/lib/supabase/client";
import { generateStudentCode } from "@/lib/students/generate-student-code";

const verifyRegistrationSchema = z.object({
  preRegistrationId: z.string().min(1),
  assignedClassId: z.string().min(1),
  assignedSection: z.string().trim().max(30).optional(),
  generateInvoice: z.boolean().optional()
});

const REQUIRED_DOCUMENT_STUBS = [
  "Birth Certificate",
  "Passport/ID",
  "Vaccination Record"
] as const;

function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function createGuardianCode() {
  const seed = Math.floor(100000 + Math.random() * 900000);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GRD-${date}-${seed}`;
}

function createInvoiceNumber() {
  const seed = Math.floor(10000 + Math.random() * 90000);
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${seed}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function resolveDefaultCampusId(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { campusId: true }
  });
  if (dbUser?.campusId) {
    return dbUser.campusId;
  }

  const campus = await prisma.campus.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (!campus?.id) {
    throw new Error("No campus configured.");
  }
  return campus.id;
}

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { user } = auth;
  if (
    user.role !== ROLE.SUPER_ADMIN &&
    !hasModulePermission(user.modulePermissions, user.role, "reception_admissions")
  ) {
    return forbidden();
  }
  if (user.role !== ROLE.SUPER_ADMIN && user.role !== ROLE.RECEPTION) {
    return forbidden("Only super admin and reception can verify registrations.");
  }

  const body = await request.json();
  const parsed = verifyRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid payload");
  }

  const { preRegistrationId, assignedClassId, assignedSection, generateInvoice } = parsed.data;
  const campusId = await resolveDefaultCampusId(user.id);

  const assignedClass = await prisma.schoolClass.findFirst({
    where: {
      id: assignedClassId,
      campusId,
      isActive: true
    },
    select: { id: true, name: true }
  });
  if (!assignedClass) {
    return badRequest("Assigned class not found for this campus.");
  }

  try {
    const transactionResult = await prisma.$transaction(async tx => {
      const registration = await tx.preRegistration.findFirst({
        where: {
          id: preRegistrationId,
          status: "unverified"
        }
      });

      if (!registration) {
        throw new Error("Pre-registration not found or already verified.");
      }

      const studentCode = await generateStudentCode(tx as unknown as PrismaClient);
      const student = await tx.student.create({
        data: {
          campusId,
          studentCode,
          firstName: registration.firstName,
          lastName: registration.lastName,
          status: "APPLICANT",
          isActive: true,
          schoolClassId: assignedClassId,
          assignedSection: assignedSection?.trim() || null
        }
      });

      const guardian = await tx.guardian.create({
        data: {
          campusId,
          guardianCode: createGuardianCode(),
          fullName: `${registration.firstName} ${registration.lastName} (Parent/Guardian)`,
          phoneNumber: registration.phone,
          email: registration.email
        }
      });

      await tx.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          isPrimary: true
        }
      });

      await tx.studentDocument.createMany({
        data: REQUIRED_DOCUMENT_STUBS.map(documentType => ({
          campusId,
          studentId: student.id,
          documentType,
          status: "PENDING",
          notes: "Required document pending parent upload."
        }))
      });

      await tx.preRegistration.update({
        where: { id: registration.id },
        data: {
          status: "verified",
          studentId: student.id,
          verifiedById: user.id,
          verifiedAt: new Date()
        }
      });

      const uploadToken = await tx.parentUploadToken.create({
        data: {
          studentId: student.id,
          expiresAt: addDays(7)
        }
      });

      if (generateInvoice) {
        const academicYear = String(new Date().getUTCFullYear());
        let invoiceCreated = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await tx.feeInvoice.create({
              data: {
                campusId,
                studentId: student.id,
                invoiceNo: createInvoiceNumber(),
                status: "DRAFT",
                academicYear,
                amountMinor: 0,
                currencyCode: "USD",
                issueDate: new Date(),
                dueDate: addDays(14),
                notes: "Initial admission fee invoice placeholder. Update amount before issuing."
              }
            });
            invoiceCreated = true;
            break;
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              continue;
            }
            throw error;
          }
        }

        if (!invoiceCreated) {
          throw new Error("Unable to generate a unique invoice number.");
        }
      }

      return {
        studentRecordId: student.id,
        studentCode: student.studentCode,
        studentFirstName: student.firstName,
        guardianEmail: guardian.email,
        uploadToken: uploadToken.token
      };
    });

    const uploadBase = getPublicSiteUrl() ?? request.nextUrl.origin;
    const uploadLink = `${uploadBase}/parent-upload?token=${encodeURIComponent(transactionResult.uploadToken)}`;
    if (transactionResult.guardianEmail) {
      void sendRegistrationApprovedEmail(
        transactionResult.guardianEmail,
        transactionResult.studentFirstName,
        transactionResult.studentCode,
        uploadLink
      ).then(result => {
        if (!result.sent) {
          const status = result.skipped ? "skipped" : "failed";
          console.warn(
            `Registration approved email ${status} for ${transactionResult.guardianEmail}: ${result.errorMessage ?? "no details"}`
          );
        }
      });
    }

    return NextResponse.json({
      success: true,
      studentId: transactionResult.studentCode,
      studentRecordId: transactionResult.studentRecordId,
      uploadLink
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Pre-registration not found or already verified.") {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
}

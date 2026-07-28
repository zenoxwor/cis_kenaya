import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { generateStudentCode } from "@/lib/students/generate-student-code";

type UploadedDocument = {
  documentType: string;
  label: string;
  fileName: string;
  fileType: string;
  storagePath: string;
};

function parseDocuments(value: Prisma.JsonValue | null): UploadedDocument[] {
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

export async function createStudentFromRegistration(registrationId: string): Promise<string | null> {
  const registration = await prisma.preRegistration.findUnique({
    where: { id: registrationId }
  });
  if (!registration) return null;

  if (registration.studentId) return registration.studentId;

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
    } catch (error) {
      console.warn("Failed to auto-create guardian from pre-registration:", error);
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
    } catch (error) {
      console.warn("Failed to create pre-registration document for student:", error);
    }
  }

  await prisma.preRegistration.update({
    where: { id: registrationId },
    data: { studentId: student.id }
  });

  return student.id;
}

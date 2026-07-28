import type { PrismaClient } from "@prisma/client";

// Generates codes like CIS-2026-0001, CIS-2026-0002, etc.
export async function generateStudentCode(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CIS-${year}-`;

  const latest = await prisma.student.findFirst({
    where: { studentCode: { startsWith: prefix } },
    orderBy: { studentCode: "desc" },
    select: { studentCode: true }
  });

  const next = latest ? Number.parseInt(latest.studentCode.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

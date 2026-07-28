import type { PrismaClient } from "@prisma/client";

export async function generateStudentCode(prisma: PrismaClient): Promise<string> {
  const used = await prisma.student.findMany({ select: { studentCode: true } });
  const usedSet = new Set(used.map(student => student.studentCode));

  for (let attempts = 0; attempts < 200; attempts += 1) {
    const num = Math.floor(Math.random() * 900) + 100;
    const code = String(num);
    if (!usedSet.has(code)) {
      return code;
    }
  }

  for (let attempts = 0; attempts < 500; attempts += 1) {
    const num = Math.floor(Math.random() * 9000) + 1000;
    const code = String(num);
    if (!usedSet.has(code)) {
      return code;
    }
  }

  throw new Error("Could not generate unique student code");
}

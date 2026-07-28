import { PrismaClient } from "@prisma/client";

function readStudentStatus(statusValue: unknown) {
  if (typeof statusValue === "string") {
    return statusValue;
  }

  if (
    statusValue &&
    typeof statusValue === "object" &&
    "set" in statusValue &&
    typeof (statusValue as { set?: unknown }).set === "string"
  ) {
    return (statusValue as { set: string }).set;
  }

  return null;
}

function maybeAssignGraduationYear(data: Record<string, unknown> | null | undefined) {
  if (!data || typeof data !== "object") {
    return;
  }

  const nextStatus = readStudentStatus(data.status);
  const hasGraduationYear = Object.prototype.hasOwnProperty.call(data, "graduationYear");

  if (nextStatus === "ALUMNI" && !hasGraduationYear) {
    data.graduationYear = new Date().getFullYear();
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

  return client.$extends({
    query: {
      student: {
        create({ args, query }) {
          maybeAssignGraduationYear(args.data as Record<string, unknown>);
          return query(args);
        },
        update({ args, query }) {
          maybeAssignGraduationYear(args.data as Record<string, unknown>);
          return query(args);
        },
        upsert({ args, query }) {
          maybeAssignGraduationYear(args.create as Record<string, unknown>);
          maybeAssignGraduationYear(args.update as Record<string, unknown>);
          return query(args);
        }
      }
    }
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: ExtendedPrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

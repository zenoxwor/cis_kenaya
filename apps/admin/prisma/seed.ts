/**
 * Prisma seed — development data for CIS Kenya Admin
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

/** Simple hash for mock passwords — NOT for production use. */
function mockHash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Seeding CIS Kenya Admin database...");

  // ── Admin Users ──────────────────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.adminUser.upsert({
      where: { username: "superadmin" },
      update: {},
      create: {
        username: "superadmin",
        passwordHash: mockHash("super123"),
        role: "superadmin",
        displayName: "Super Admin",
      },
    }),
    prisma.adminUser.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        passwordHash: mockHash("admin123"),
        role: "admin",
        displayName: "Admin User",
      },
    }),
    prisma.adminUser.upsert({
      where: { username: "principal" },
      update: {},
      create: {
        username: "principal",
        passwordHash: mockHash("principal123"),
        role: "principal",
        displayName: "Mrs. Wanjiku Kamau",
      },
    }),
    prisma.adminUser.upsert({
      where: { username: "reception" },
      update: {},
      create: {
        username: "reception",
        passwordHash: mockHash("reception123"),
        role: "reception",
        displayName: "Reception Desk",
      },
    }),
  ]);
  console.log(`✅ Seeded ${users.length} admin users`);

  // ── School Classes ────────────────────────────────────────────────────────────
  const classData = [
    { name: "PP1", gradeLevel: "PP1" },
    { name: "PP2", gradeLevel: "PP2" },
    { name: "Grade 1", gradeLevel: "1" },
    { name: "Grade 2", gradeLevel: "2" },
    { name: "Grade 3", gradeLevel: "3" },
    { name: "Grade 4", gradeLevel: "4" },
    { name: "Grade 5", gradeLevel: "5" },
    { name: "Grade 6", gradeLevel: "6" },
  ];

  const classes: { id: string; name: string }[] = [];
  for (const c of classData) {
    const cls = await prisma.schoolClass.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    classes.push(cls);
  }
  console.log(`✅ Seeded ${classes.length} school classes`);

  // ── Students ──────────────────────────────────────────────────────────────────
  const studentFirstNames = [
    "Amara", "Baraka", "Cynthia", "David", "Esther",
    "Felix", "Grace", "Hassan", "Irene", "James",
    "Kezia", "Liam", "Mercy", "Nathan", "Olivia",
  ];
  const studentLastNames = [
    "Kamau", "Otieno", "Wangari", "Mwangi", "Njoroge",
    "Odhiambo", "Kimani", "Achieng", "Kariuki", "Mutua",
  ];

  let studentCount = 0;
  for (const cls of classes.slice(0, 4)) {
    for (let i = 0; i < 5; i++) {
      const fn = studentFirstNames[(studentCount) % studentFirstNames.length];
      const ln = studentLastNames[(studentCount + i) % studentLastNames.length];
      const no = `CIS-2024-${String(studentCount + 1).padStart(3, "0")}`;
      await prisma.student.upsert({
        where: { studentNo: no },
        update: {},
        create: {
          studentNo: no,
          firstName: fn,
          lastName: ln,
          classId: cls.id,
        },
      });
      studentCount++;
    }
  }
  console.log(`✅ Seeded ${studentCount} students`);

  // ── Attendance Period ─────────────────────────────────────────────────────────
  const now = new Date();
  const termStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const termEnd = new Date(now.getFullYear(), now.getMonth() + 3, 30);

  await prisma.attendancePeriod.upsert({
    where: { id: "seed-term-1" },
    update: {},
    create: {
      id: "seed-term-1",
      name: `Term 3 ${now.getFullYear()}`,
      type: "term",
      startDate: termStart,
      endDate: termEnd,
      status: "OPEN",
    },
  });
  console.log("✅ Seeded attendance period (Term 3)");

  console.log("\n🎉 Seed complete! Development users:");
  console.log("   superadmin / super123");
  console.log("   admin      / admin123");
  console.log("   principal  / principal123");
  console.log("   reception  / reception123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

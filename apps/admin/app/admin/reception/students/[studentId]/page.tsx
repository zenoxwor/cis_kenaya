import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireReceptionUser } from "@/lib/reception/access";
import { getDisplayStudentCode } from "@/lib/students/get-display-student-code";

type PageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toLocaleString("en-KE");
}

export default async function ReceptionStudentProfilePage({ params }: PageProps) {
  await requireReceptionUser("/admin/reception/students");
  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      schoolClass: { select: { name: true, gradeLevel: true } },
      studentLinks: {
        include: {
          guardian: {
            select: {
              fullName: true,
              relationship: true,
              phoneNumber: true,
              email: true,
              city: true,
              country: true
            }
          }
        },
        orderBy: [{ isPrimary: "desc" }]
      },
      documents: {
        select: {
          id: true,
          documentType: true,
          status: true,
          uploadedAt: true,
          updatedAt: true
        },
        orderBy: [{ updatedAt: "desc" }]
      }
    }
  });

  if (!student) {
    notFound();
  }

  const primaryGuardian = student.studentLinks[0]?.guardian;
  const displayCode = getDisplayStudentCode(student.studentCode, student.graduationYear);
  const classDisplay = student.schoolClass
    ? `${student.schoolClass.gradeLevel}${student.assignedSection ? ` • ${student.assignedSection}` : ""}`
    : "Unassigned";

  return (
    <section className="space-y-4">
      <header className="admin-content-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student Profile</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {student.firstName} {student.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Student ID: <span className="font-semibold">{displayCode}</span>
          </p>
        </div>
        <Link
          href="/admin/reception/pre-registrations"
          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Pre-Registrations
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="admin-content-card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Student Details</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Grade / Class</dt>
              <dd className="font-medium text-slate-900">{classDisplay}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Class Name</dt>
              <dd className="font-medium text-slate-900">{student.schoolClass?.name ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-900">{student.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Enrolled At</dt>
              <dd className="font-medium text-slate-900">{formatDate(student.enrolledAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date of Birth</dt>
              <dd className="font-medium text-slate-900">{formatDate(student.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Gender</dt>
              <dd className="font-medium text-slate-900">{student.gender ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Nationality</dt>
              <dd className="font-medium text-slate-900">{student.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">National ID</dt>
              <dd className="font-medium text-slate-900">{student.nationalId ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-content-card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Guardian Contact</h2>
          {primaryGuardian ? (
            <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Full Name</dt>
                <dd className="font-medium text-slate-900">{primaryGuardian.fullName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Relationship</dt>
                <dd className="font-medium text-slate-900">{primaryGuardian.relationship ?? "Parent/Guardian"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{primaryGuardian.phoneNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{primaryGuardian.email ?? "—"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium text-slate-900">
                  {[primaryGuardian.city, primaryGuardian.country].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600">No guardian linked yet.</p>
          )}
        </article>
      </div>

      <article className="admin-content-card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Documents</h2>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Document Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Uploaded At</th>
              <th className="px-3 py-2">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {student.documents.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                  No documents recorded yet.
                </td>
              </tr>
            )}
            {student.documents.map(doc => (
              <tr key={doc.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{doc.documentType}</td>
                <td className="px-3 py-2">{doc.status}</td>
                <td className="px-3 py-2">{formatDateTime(doc.uploadedAt)}</td>
                <td className="px-3 py-2">{formatDateTime(doc.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

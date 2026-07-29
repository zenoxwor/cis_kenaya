import { Prisma } from "@prisma/client";
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

type UploadedDocumentMeta = {
  documentType: string;
  label: string;
  fileName: string;
  fileType: string;
  storagePath: string;
};

function parseUploadedDocuments(value: unknown | null): UploadedDocumentMeta[] {
  if (!Array.isArray(value)) return [];
  const parsed: UploadedDocumentMeta[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const documentType = typeof row.documentType === "string" ? row.documentType : "";
    const label = typeof row.label === "string" ? row.label : "";
    const fileName = typeof row.fileName === "string" ? row.fileName : "";
    const fileType = typeof row.fileType === "string" ? row.fileType : "";
    const storagePath = typeof row.storagePath === "string" ? row.storagePath : "";
    if (!documentType || !storagePath) continue;
    parsed.push({ documentType, label, fileName, fileType, storagePath });
  }
  return parsed;
}

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

function renderAddress(city?: string | null, country?: string | null) {
  return [city, country].filter(Boolean).join(", ") || "—";
}

export default async function ReceptionStudentProfilePage({ params }: PageProps) {
  await requireReceptionUser("/admin/reception/students");
  const { studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      campus: { select: { name: true } },
      schoolClass: { select: { name: true, gradeLevel: true } },
      studentLinks: {
        include: {
          guardian: {
            select: {
              id: true,
              fullName: true,
              relationship: true,
              phoneNumber: true,
              email: true,
              occupation: true,
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
          fileName: true,
          storagePath: true,
          notes: true,
          uploadedAt: true,
          verifiedAt: true,
          rejectedAt: true,
          updatedAt: true
        },
        orderBy: [{ updatedAt: "desc" }]
      },
      preRegistrations: {
        select: {
          id: true,
          applicationRef: true,
          status: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          gradeLevel: true,
          curriculum: true,
          createdAt: true,
          verifiedAt: true,
          documents: true,
          verifiedBy: {
            select: {
              fullName: true,
              email: true
            }
          }
        },
        orderBy: [{ createdAt: "desc" }]
      },
      parentUploadTokens: {
        select: {
          token: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: [{ createdAt: "desc" }]
      },
      invoices: {
        select: {
          invoiceNo: true,
          status: true,
          academicYear: true,
          amountMinor: true,
          currencyCode: true,
          issueDate: true,
          dueDate: true
        },
        orderBy: [{ createdAt: "desc" }]
      }
    }
  });

  if (!student) {
    notFound();
  }

  const displayCode = getDisplayStudentCode(student.studentCode, student.graduationYear);
  const classDisplay = student.schoolClass
    ? `${student.schoolClass.gradeLevel}${student.assignedSection ? ` • ${student.assignedSection}` : ""}`
    : "Unassigned";
  const latestPreReg = student.preRegistrations[0] ?? null;

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
              <dt className="text-slate-500">Campus</dt>
              <dd className="font-medium text-slate-900">{student.campus.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Grade / Section</dt>
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
              <dt className="text-slate-500">Primary Language</dt>
              <dd className="font-medium text-slate-900">{student.primaryLanguage ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">National ID</dt>
              <dd className="font-medium text-slate-900">{student.nationalId ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-content-card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Registration & Verification</h2>
          {latestPreReg ? (
            <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Application Ref</dt>
                <dd className="font-medium text-slate-900">{latestPreReg.applicationRef ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Registration Status</dt>
                <dd className="font-medium text-slate-900">{latestPreReg.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Registered Name</dt>
                <dd className="font-medium text-slate-900">
                  {latestPreReg.firstName} {latestPreReg.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Registered Grade</dt>
                <dd className="font-medium text-slate-900">{latestPreReg.gradeLevel}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Parent Email</dt>
                <dd className="font-medium text-slate-900">{latestPreReg.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Parent Phone</dt>
                <dd className="font-medium text-slate-900">{latestPreReg.phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Curriculum</dt>
                <dd className="font-medium text-slate-900">{latestPreReg.curriculum}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Submitted At</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(latestPreReg.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Verified At</dt>
                <dd className="font-medium text-slate-900">{formatDateTime(latestPreReg.verifiedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Verified By</dt>
                <dd className="font-medium text-slate-900">
                  {latestPreReg.verifiedBy?.fullName ?? "—"}
                  {latestPreReg.verifiedBy?.email ? ` (${latestPreReg.verifiedBy.email})` : ""}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-600">No linked pre-registration found.</p>
          )}
        </article>
      </div>

      <article className="admin-content-card space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Guardian Contacts</h2>
        {student.studentLinks.length === 0 ? (
          <p className="text-sm text-slate-600">No guardians linked yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {student.studentLinks.map(link => (
              <div key={link.guardian.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {link.guardian.fullName}
                  {link.isPrimary ? " (Primary)" : ""}
                </p>
                <p className="mt-1 text-sm text-slate-700">{link.guardian.relationship ?? "Parent/Guardian"}</p>
                <p className="mt-1 text-sm text-slate-700">Phone: {link.guardian.phoneNumber}</p>
                <p className="mt-1 text-sm text-slate-700">Email: {link.guardian.email ?? "—"}</p>
                <p className="mt-1 text-sm text-slate-700">Occupation: {link.guardian.occupation ?? "—"}</p>
                <p className="mt-1 text-sm text-slate-700">
                  Address: {renderAddress(link.guardian.city, link.guardian.country)}
                </p>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="admin-content-card overflow-x-auto">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Document Records</h2>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Document Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Uploaded</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {student.documents.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    No documents recorded yet.
                  </td>
                </tr>
              )}
              {student.documents.map(doc => (
                <tr key={doc.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{doc.documentType}</td>
                  <td className="px-3 py-2">{doc.status}</td>
                  <td className="px-3 py-2">{doc.fileName ?? "—"}</td>
                  <td className="px-3 py-2">{formatDateTime(doc.uploadedAt)}</td>
                  <td className="px-3 py-2">{formatDateTime(doc.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-content-card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Upload Access & Finance</h2>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Parent Upload Tokens</h3>
            {student.parentUploadTokens.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">No upload tokens issued yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {student.parentUploadTokens.map(token => (
                  <li key={token.token} className="rounded-lg border border-slate-200 p-2">
                    <p>Token: {token.token}</p>
                    <p>Created: {formatDateTime(token.createdAt)}</p>
                    <p>Expires: {formatDateTime(token.expiresAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">Fee Invoices</h3>
            {student.invoices.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">No invoices yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {student.invoices.map(invoice => (
                  <li key={invoice.invoiceNo} className="rounded-lg border border-slate-200 p-2">
                    <p>
                      {invoice.invoiceNo} • {invoice.status} • {invoice.academicYear}
                    </p>
                    <p>
                      Amount: {(invoice.amountMinor / 100).toFixed(2)} {invoice.currencyCode}
                    </p>
                    <p>
                      Issued: {formatDate(invoice.issueDate)} • Due: {formatDate(invoice.dueDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </div>

      {latestPreReg && (
        <article className="admin-content-card">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Original Uploaded Files (Pre-Registration)</h2>
          {parseUploadedDocuments(latestPreReg.documents).length === 0 ? (
            <p className="text-sm text-slate-600">No original files were uploaded in the public registration.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {parseUploadedDocuments(latestPreReg.documents).map((doc, index) => (
                <li key={`${doc.storagePath}-${index}`} className="rounded-lg border border-slate-200 p-2">
                  <p className="font-medium text-slate-900">{doc.label || doc.documentType}</p>
                  <p>File: {doc.fileName || "—"}</p>
                  <p>Type: {doc.fileType || "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
    </section>
  );
}

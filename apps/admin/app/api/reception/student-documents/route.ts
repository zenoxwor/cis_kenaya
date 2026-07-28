import { NextRequest, NextResponse } from "next/server";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import {
  listReceptionDocumentStudents,
  RECEPTION_DOCUMENT_TYPES,
  upsertReceptionStudentDocument
} from "@/lib/reception/portal-repository";
import { ROLE } from "@/lib/rbac/roles";
import { getSupabaseStorageClient } from "@/lib/supabase/client";

const STORAGE_BUCKET = "student-documents";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function canRead(role: string) {
  return role === ROLE.SUPER_ADMIN || role === ROLE.PRINCIPAL || role === ROLE.RECEPTION;
}

function canWrite(role: string) {
  return role === ROLE.SUPER_ADMIN || role === ROLE.PRINCIPAL || role === ROLE.RECEPTION;
}

function isReceptionDocumentType(value: string): value is (typeof RECEPTION_DOCUMENT_TYPES)[number] {
  return (RECEPTION_DOCUMENT_TYPES as readonly string[]).includes(value);
}

function toSafeDocumentSlug(value: string) {
  return value.toLowerCase().replace(/[^\w]+/g, "-");
}

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName && fromName.length > 0) return fromName;
  const byType: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
  };
  return byType[file.type] ?? "bin";
}

async function withSignedUrls(
  rows: Awaited<ReturnType<typeof listReceptionDocumentStudents>>
) {
  const supabase = getSupabaseStorageClient();
  if (!supabase) {
    return rows.map(student => ({
      ...student,
      documents: student.documents.map(doc => ({ ...doc, signedUrl: null }))
    }));
  }

  return Promise.all(
    rows.map(async student => ({
      ...student,
      documents: await Promise.all(
        student.documents.map(async doc => {
          if (!doc.storagePath) {
            return { ...doc, signedUrl: null };
          }
          const { data } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(doc.storagePath, SIGNED_URL_EXPIRY_SECONDS);
          return { ...doc, signedUrl: data?.signedUrl ?? null };
        })
      )
    }))
  );
}

export async function GET(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    return forbidden();
  }
  if (!canRead(user.role)) {
    return forbidden("Role does not have access to reception documents.");
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const students = await withSignedUrls(
    await listReceptionDocumentStudents(user, { query })
  );

  return NextResponse.json({
    success: true,
    data: { students }
  });
}

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    return forbidden();
  }
  if (!canWrite(user.role)) {
    return forbidden("Role cannot upload reception documents.");
  }

  const formData = await request.formData();
  const studentIdRaw = formData.get("studentId");
  const documentTypeRaw = formData.get("documentType");
  const fileRaw = formData.get("file");

  if (typeof studentIdRaw !== "string" || studentIdRaw.trim().length === 0) {
    return badRequest("studentId is required.");
  }
  if (typeof documentTypeRaw !== "string" || !isReceptionDocumentType(documentTypeRaw)) {
    return badRequest("Unsupported document type.");
  }
  if (!(fileRaw instanceof File) || fileRaw.size <= 0) {
    return badRequest("A file upload is required.");
  }

  const supabase = getSupabaseStorageClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase storage is not configured." },
      { status: 503 }
    );
  }

  const extension = getFileExtension(fileRaw);
  const storagePath = `reception/${studentIdRaw}/${toSafeDocumentSlug(documentTypeRaw)}-${Date.now()}.${extension}`;
  const fileBuffer = Buffer.from(await fileRaw.arrayBuffer());
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, fileBuffer, {
    contentType: fileRaw.type || "application/octet-stream",
    upsert: true
  });
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  await upsertReceptionStudentDocument(user, {
    studentId: studentIdRaw,
    documentType: documentTypeRaw,
    fileName: fileRaw.name,
    storagePath
  });

  const [student] = await withSignedUrls(
    await listReceptionDocumentStudents(user, { studentId: studentIdRaw })
  );
  return NextResponse.json({
    success: true,
    data: { student: student ?? null }
  });
}

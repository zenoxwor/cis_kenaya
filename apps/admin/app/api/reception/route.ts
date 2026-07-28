import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasModulePermission } from "@/lib/admin/module-permissions";
import { requireRequestUser } from "@/lib/auth/api-authorization";
import { ROLE } from "@/lib/rbac/roles";
import {
  checkoutGatePass,
  createAppointment,
  createGatePass,
  createIncident,
  createInquiry,
  createLostFoundItem,
  getReceptionDashboard,
  intakeStudentDocument,
  issueEarlyPickup,
  listAppointments,
  listEarlyPickups,
  listGatePasses,
  listIncidents,
  listInquiries,
  listLostFoundItems,
  listStaffCheckIns,
  listStudentDocumentOverview,
  listStudentDocuments,
  markStaffCheck,
  searchReceptionDirectory,
  searchStudentsForEarlyPickup,
  updateAppointmentStatus,
  updateIncidentStatus,
  updateInquiryStatus,
  updateLostFoundStatus
} from "@/lib/reception/repository";
import {
  notifyPrincipalsAboutAppointment,
  notifyPrincipalsAboutIncident
} from "@/lib/reception/principal-notifications";
import { REQUIRED_RECEPTION_DOCUMENT_TYPES } from "@/lib/reception/types";

function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function canViewReception(role: string) {
  return role === ROLE.SUPER_ADMIN || role === ROLE.PRINCIPAL || role === ROLE.RECEPTION;
}

function canManageReception(role: string) {
  return role === ROLE.SUPER_ADMIN || role === ROLE.RECEPTION;
}

const statusSchema = z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]);
const appointmentStatusSchema = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]);
const lostFoundStatusSchema = z.enum(["UNCLAIMED", "CLAIMED"]);

export async function GET(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth;

  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    return forbidden();
  }
  if (!canViewReception(user.role)) {
    return forbidden("Role does not have reception visibility.");
  }

  const section = request.nextUrl.searchParams.get("section") ?? "dashboard";
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const role = request.nextUrl.searchParams.get("role") ?? "";
  const department = request.nextUrl.searchParams.get("department") ?? "";

  if (section === "dashboard") {
    const data = await getReceptionDashboard(user);
    return NextResponse.json({ success: true, data });
  }

  if (section === "search") {
    const data = await searchReceptionDirectory(user, query);
    return NextResponse.json({ success: true, data });
  }

  if (section === "checkins") {
    const data = await listStaffCheckIns(user, {
      role: role || undefined,
      department: department || undefined
    });
    return NextResponse.json({ success: true, data });
  }

  if (section === "incidents") {
    const [incidents, inquiries] = await Promise.all([listIncidents(user), listInquiries(user)]);
    return NextResponse.json({ success: true, data: { incidents, inquiries } });
  }

  if (section === "visitors") {
    const data = await listGatePasses(user);
    return NextResponse.json({ success: true, data });
  }

  if (section === "early-pickup") {
    const [logs, students] = await Promise.all([
      listEarlyPickups(user),
      query ? searchStudentsForEarlyPickup(user, query) : Promise.resolve([])
    ]);
    return NextResponse.json({ success: true, data: { logs, students } });
  }

  if (section === "appointments") {
    const data = await listAppointments(user);
    return NextResponse.json({ success: true, data });
  }

  if (section === "lost-found") {
    const data = await listLostFoundItems(user);
    return NextResponse.json({ success: true, data });
  }

  if (section === "documents") {
    const [overview, records] = await Promise.all([
      listStudentDocumentOverview(user),
      listStudentDocuments(user)
    ]);
    return NextResponse.json({
      success: true,
      data: {
        overview,
        records,
        requiredTypes: REQUIRED_RECEPTION_DOCUMENT_TYPES
      }
    });
  }

  return badRequest("Unknown section");
}

export async function POST(request: NextRequest) {
  const auth = requireRequestUser(request);
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth;
  if (!hasModulePermission(user.modulePermissions, user.role, "reception_admissions")) {
    return forbidden();
  }
  if (!canManageReception(user.role)) {
    return forbidden("Only reception and super admin can modify reception workflows.");
  }

  const body = (await request.json()) as { action?: string } & Record<string, unknown>;
  if (!body.action) {
    return badRequest("action is required");
  }

  if (body.action === "staff.mark") {
    const parsed = z
      .object({
        userId: z.string().min(1),
        checkAction: z.enum(["checkIn", "checkOut"])
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid staff mark payload");
    }
    await markStaffCheck(user, {
      userId: parsed.data.userId,
      action: parsed.data.checkAction
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "incident.create") {
    const parsed = z
      .object({
        type: z.string().min(2),
        description: z.string().min(4),
        reportedBy: z.string().min(2),
        department: z.string().min(2)
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid incident payload");
    }
    const incident = await createIncident(user, parsed.data);
    void notifyPrincipalsAboutIncident(user.id, {
      incidentId: incident.id,
      incidentType: incident.type,
      priority: incident.priority,
      personName: incident.personName,
      description: incident.description,
      reportedByName: parsed.data.reportedBy,
      createdAt: incident.createdAt
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "incident.status") {
    const parsed = z
      .object({
        id: z.string().min(1),
        status: statusSchema
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid incident status payload");
    }
    await updateIncidentStatus(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "inquiry.create") {
    const parsed = z
      .object({
        callerName: z.string().min(2),
        callerPhone: z.string().optional(),
        subject: z.string().min(2),
        notes: z.string().optional(),
        followUpDate: z.string().optional()
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid inquiry payload");
    }
    await createInquiry(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "inquiry.status") {
    const parsed = z
      .object({
        id: z.string().min(1),
        status: z.string().min(2)
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid inquiry status payload");
    }
    await updateInquiryStatus(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "gatepass.create") {
    const parsed = z
      .object({
        visitorName: z.string().min(2),
        visitorId: z.string().min(2),
        purpose: z.string().min(2),
        personToMeet: z.string().min(2),
        department: z.string().min(2)
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid gate pass payload");
    }
    await createGatePass(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "gatepass.checkout") {
    const parsed = z.object({ gatePassId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid gate pass checkout payload");
    }
    await checkoutGatePass(user, parsed.data.gatePassId);
    return NextResponse.json({ success: true });
  }

  if (body.action === "pickup.issue") {
    const parsed = z
      .object({
        studentId: z.string().min(1),
        guardianId: z.string().min(1),
        notes: z.string().optional()
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid early pickup payload");
    }
    await issueEarlyPickup(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "appointment.create") {
    const parsed = z
      .object({
        title: z.string().min(2),
        description: z.string().optional(),
        parentName: z.string().min(2),
        parentPhone: z.string().optional(),
        meetingWith: z.string().min(2),
        scheduledAt: z.string().min(2)
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid appointment payload");
    }
    const appointment = await createAppointment(user, parsed.data);
    void notifyPrincipalsAboutAppointment(user.id, {
      appointmentId: appointment.id,
      title: appointment.title,
      parentName: appointment.parentName,
      parentPhone: appointment.parentPhone,
      meetingWith: appointment.meetingWith,
      scheduledAt: appointment.scheduledAt,
      createdByName: user.fullName
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "appointment.status") {
    const parsed = z
      .object({
        id: z.string().min(1),
        status: appointmentStatusSchema
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid appointment status payload");
    }
    await updateAppointmentStatus(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "lostfound.create") {
    const parsed = z
      .object({
        description: z.string().min(2),
        foundBy: z.string().min(2),
        location: z.string().min(2),
        foundDate: z.string().optional()
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid lost-and-found payload");
    }
    await createLostFoundItem(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "lostfound.status") {
    const parsed = z
      .object({
        id: z.string().min(1),
        status: lostFoundStatusSchema,
        claimedBy: z.string().optional()
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid lost-and-found status payload");
    }
    await updateLostFoundStatus(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  if (body.action === "document.intake") {
    const parsed = z
      .object({
        studentId: z.string().min(1),
        documentType: z.string().min(2),
        fileName: z.string().optional(),
        notes: z.string().optional()
      })
      .safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid document intake payload");
    }
    await intakeStudentDocument(user, parsed.data);
    return NextResponse.json({ success: true });
  }

  return badRequest("Unknown action");
}

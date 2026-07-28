import { RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { sendCommunicationEmail } from "@/lib/email/resend";

type IncidentNotificationInput = {
  incidentId: string;
  incidentType: string;
  priority?: string;
  personName?: string | null;
  description: string;
  reportedByName: string;
  createdAt: Date;
};

type AppointmentNotificationInput = {
  appointmentId: string;
  title: string;
  parentName: string;
  parentPhone?: string | null;
  meetingWith: string;
  scheduledAt: Date;
  createdByName: string;
};

async function listPrincipalRecipientEmails(actorUserId: string): Promise<string[]> {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { campusId: true }
  });
  if (!actor?.campusId) return [];

  const principals = await prisma.user.findMany({
    where: {
      campusId: actor.campusId,
      isActive: true,
      role: { code: RoleCode.PRINCIPAL }
    },
    select: { email: true }
  });

  return principals
    .map(row => row.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));
}

export async function notifyPrincipalsAboutIncident(
  actorUserId: string,
  input: IncidentNotificationInput
) {
  const recipients = await listPrincipalRecipientEmails(actorUserId);
  if (recipients.length === 0) return;

  const subject = `New ${input.incidentType} logged for Principal review`;
  const body = [
    "A new incident/complaint has been logged by Reception.",
    "",
    `Incident ID: ${input.incidentId}`,
    `Type: ${input.incidentType}`,
    `Priority: ${input.priority ?? "MEDIUM"}`,
    `Target/Student: ${input.personName?.trim() || "Not provided"}`,
    `Reported by: ${input.reportedByName}`,
    `Logged at: ${input.createdAt.toLocaleString("en-KE")}`,
    "",
    "Description:",
    input.description
  ].join("\n");

  await Promise.all(
    recipients.map(async email => {
      const result = await sendCommunicationEmail(email, subject, body);
      if (!result.sent) {
        const mode = result.skipped ? "skipped" : "failed";
        console.warn(
          `Principal incident notification ${mode} for ${email}: ${result.errorMessage ?? "no details"}`
        );
      }
    })
  );
}

export async function notifyPrincipalsAboutAppointment(
  actorUserId: string,
  input: AppointmentNotificationInput
) {
  const recipients = await listPrincipalRecipientEmails(actorUserId);
  if (recipients.length === 0) return;

  const subject = "New appointment scheduled by Reception";
  const body = [
    "A new appointment has been scheduled and requires Principal visibility.",
    "",
    `Appointment ID: ${input.appointmentId}`,
    `Title: ${input.title}`,
    `Parent/Guardian: ${input.parentName}`,
    `Parent Phone: ${input.parentPhone?.trim() || "Not provided"}`,
    `Meeting With: ${input.meetingWith}`,
    `Scheduled At: ${input.scheduledAt.toLocaleString("en-KE")}`,
    `Created by: ${input.createdByName}`
  ].join("\n");

  await Promise.all(
    recipients.map(async email => {
      const result = await sendCommunicationEmail(email, subject, body);
      if (!result.sent) {
        const mode = result.skipped ? "skipped" : "failed";
        console.warn(
          `Principal appointment notification ${mode} for ${email}: ${result.errorMessage ?? "no details"}`
        );
      }
    })
  );
}

import type {
  MessageTemplate,
  MessageCampaign,
  MessageDelivery,
  CommunicationsStats,
  ComposePayload,
  AudienceFilter
} from "./types";
import { sendCommunicationEmail } from "@/lib/email/resend";
import {
  MOCK_TEMPLATES,
  MOCK_CAMPAIGNS,
  MOCK_DELIVERIES,
  MOCK_STATS
} from "./mock-data";

// ─── In-memory stores (mock persistence) ─────────────────────────────────────

const templates: MessageTemplate[] = [...MOCK_TEMPLATES];
const campaigns: MessageCampaign[] = [...MOCK_CAMPAIGNS];
const deliveries: MessageDelivery[] = [...MOCK_DELIVERIES];
const automationDispatchKeys = new Set<string>();

type DocumentReminderLogInput = {
  sentById: string;
  sentByName: string;
  reminderType: "missing" | "expiry";
  reminders: Array<{
    studentName: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail: string | null;
    documentName: string;
    category: string;
    expiresAt: string | null;
  }>;
};

// ─── Templates ────────────────────────────────────────────────────────────────

export function listTemplates(): MessageTemplate[] {
  return templates;
}

export function getTemplate(id: string): MessageTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function createTemplate(
  data: Pick<MessageTemplate, "name" | "subject" | "body" | "type" | "category">
): MessageTemplate {
  const tpl: MessageTemplate = {
    id: `tpl_${Date.now()}`,
    campusId: "campus_main",
    name: data.name,
    subject: data.subject,
    body: data.body,
    type: data.type,
    category: data.category,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  templates.push(tpl);
  return tpl;
}

export function updateTemplate(
  id: string,
  data: Partial<Pick<MessageTemplate, "name" | "subject" | "body" | "type" | "category">>
): MessageTemplate | null {
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const existing = templates[idx]!;
  if (existing.isSystem) return null; // system templates are read-only
  const updated = { ...existing, ...data, updatedAt: new Date() };
  templates[idx] = updated;
  return updated;
}

export function deleteTemplate(id: string): boolean {
  const idx = templates.findIndex(t => t.id === id && !t.isSystem);
  if (idx === -1) return false;
  templates.splice(idx, 1);
  return true;
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function listCampaigns(): MessageCampaign[] {
  return [...campaigns].sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
  );
}

export function getCampaign(id: string): MessageCampaign | undefined {
  return campaigns.find(c => c.id === id);
}

function renderMessageTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    return key in variables ? variables[key]! : match;
  });
}

function buildTemplateVariables(
  guardian: Pick<MockGuardian, "fullName" | "email">,
  audienceMeta: Record<string, unknown> | null | undefined
) {
  const variables: Record<string, string> = {
    guardianName: guardian.fullName,
    guardianEmail: guardian.email ?? ""
  };

  if (audienceMeta) {
    for (const [key, value] of Object.entries(audienceMeta)) {
      if (value === null || value === undefined) {
        continue;
      }

      variables[key] = String(value);
    }
  }

  return variables;
}

async function sendEmailDelivery(
  delivery: MessageDelivery,
  template: MessageTemplate,
  audienceMeta: Record<string, unknown> | null | undefined
) {
  const now = new Date();
  if (!delivery.guardianEmail) {
    delivery.status = "FAILED";
    delivery.errorMessage = "Guardian email is missing.";
    delivery.sentAt = null;
    delivery.deliveredAt = null;
    delivery.updatedAt = now;
    return false;
  }

  const variables = buildTemplateVariables(
    {
      fullName: delivery.guardianName ?? "Parent / Guardian",
      email: delivery.guardianEmail ?? null
    },
    audienceMeta
  );
  const subject = renderMessageTemplate(
    template.subject ?? "CIS Kenya Admin Communication",
    variables
  );
  const body = renderMessageTemplate(template.body, variables);
  const result = await sendCommunicationEmail(delivery.guardianEmail, subject, body);

  delivery.updatedAt = now;
  if (result.sent) {
    delivery.status = "SENT";
    delivery.errorMessage = null;
    delivery.sentAt = now;
    delivery.deliveredAt = null;
    return true;
  }

  delivery.status = "FAILED";
  delivery.errorMessage = result.errorMessage;
  delivery.sentAt = null;
  delivery.deliveredAt = null;
  return false;
}

/**
 * Mock send: resolves audience, creates a campaign + deliveries, and sends email deliveries through Resend.
 */
export async function sendCampaign(
  payload: ComposePayload,
  sentById: string,
  sentByName: string
): Promise<MessageCampaign> {
  const template = getTemplate(payload.templateId);
  if (!template) throw new Error("Template not found");

  const audience = resolveAudience(payload.audienceFilter);
  const campaign: MessageCampaign = {
    id: `camp_${Date.now()}`,
    campusId: "campus_main",
    templateId: payload.templateId,
    sentById,
    audienceFilter: payload.audienceFilter,
    audienceMeta: payload.audienceMeta ?? null,
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    sentAt: payload.scheduledAt ? null : new Date(),
    status: payload.scheduledAt ? "SCHEDULED" : "SENT",
    totalCount: audience.length,
    sentCount: payload.scheduledAt ? 0 : audience.length,
    failedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: {
      id: template.id,
      name: template.name,
      subject: template.subject,
      type: template.type,
      category: template.category
    },
    sentByName
  };

  campaigns.unshift(campaign);

  if (!payload.scheduledAt) {
    const createdDeliveries: MessageDelivery[] = [];

    for (const guardian of audience) {
      const channels: Array<"SMS" | "EMAIL"> =
        template.type === "BOTH"
          ? ["SMS", "EMAIL"]
          : template.type === "SMS"
          ? ["SMS"]
          : ["EMAIL"];

      for (const channel of channels) {
        const delivery: MessageDelivery = {
          id: `del_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          campaignId: campaign.id,
          guardianId: guardian.id,
          channel,
          status: channel === "EMAIL" ? "PENDING" : "SENT",
          errorMessage: null,
          sentAt: channel === "EMAIL" ? null : new Date(),
          deliveredAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          guardianName: guardian.fullName,
          guardianPhone: guardian.phoneNumber,
          guardianEmail: guardian.email ?? undefined
        };

        deliveries.push(delivery);
        createdDeliveries.push(delivery);
      }
    }

    const emailDeliveries = createdDeliveries.filter(delivery => delivery.channel === "EMAIL");
    const emailResults = await Promise.all(
      emailDeliveries.map(delivery => sendEmailDelivery(delivery, template, payload.audienceMeta))
    );
    const sentEmailCount = emailResults.filter(Boolean).length;
    const failedEmailCount = emailResults.length - sentEmailCount;
    const sentSmsCount = createdDeliveries.length - emailDeliveries.length;

    campaign.sentCount = sentSmsCount + sentEmailCount;
    campaign.failedCount = failedEmailCount;
    campaign.status = campaign.sentCount > 0 ? "SENT" : failedEmailCount > 0 ? "FAILED" : "SENT";
    campaign.updatedAt = new Date();
  }

  return campaign;
}

export function logDocumentReminderCampaign(input: DocumentReminderLogInput): MessageCampaign | null {
  if (input.reminders.length === 0) {
    return null;
  }

  const now = new Date();
  const campaign: MessageCampaign = {
    id: `camp_doc_${Date.now()}`,
    campusId: "campus_main",
    templateId: `tpl_document_${input.reminderType}`,
    sentById: input.sentById,
    audienceFilter: "individual",
    audienceMeta: {
      reminderType: input.reminderType,
      totalDocuments: input.reminders.length
    },
    scheduledAt: null,
    sentAt: now,
    status: "SENT",
    totalCount: input.reminders.length,
    sentCount: input.reminders.length,
    failedCount: 0,
    createdAt: now,
    updatedAt: now,
    template: {
      id: `tpl_document_${input.reminderType}`,
      name:
        input.reminderType === "missing"
          ? "Missing Document Reminder"
          : "Document Expiry Reminder",
      subject:
        input.reminderType === "missing"
          ? "Missing student document follow-up"
          : "Student document expiry notice",
      type: "BOTH",
      category: "DOCUMENT"
    },
    sentByName: input.sentByName
  };

  campaigns.unshift(campaign);

  for (const reminder of input.reminders) {
    const channels: Array<"SMS" | "EMAIL"> = reminder.guardianEmail ? ["SMS", "EMAIL"] : ["SMS"];

    for (const channel of channels) {
      deliveries.push({
        id: `del_doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        campaignId: campaign.id,
        guardianId: `guardian_${reminder.studentName.toLowerCase().replace(/\s+/g, "_")}`,
        channel,
        status: "SENT",
        errorMessage: null,
        sentAt: now,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
        guardianName: reminder.guardianName,
        guardianPhone: reminder.guardianPhone,
        guardianEmail: reminder.guardianEmail ?? undefined
      });
    }
  }

  return campaign;
}

type AutomationCampaignPayload = {
  dedupeKey: string;
  triggerType: "UNPAID_RISK_REMINDER" | "EXAM_HOLD_NOTICE" | "OVERDUE_INVOICE_REMINDER";
  studentName: string;
  guardianName: string;
  guardianPhone?: string;
  guardianEmail?: string;
  message: string;
};

export function sendAutomationCampaign(payload: AutomationCampaignPayload) {
  if (automationDispatchKeys.has(payload.dedupeKey)) {
    return null;
  }

  const template =
    getTemplate("tpl_fee_overdue") ??
    templates.find(item => item.category === "FEE") ??
    templates[0];

  if (!template) {
    throw new Error("No communication template available for automation.");
  }

  const campaignId = `camp_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const campaign: MessageCampaign = {
    id: campaignId,
    campusId: "campus_main",
    templateId: template.id,
    sentById: "system_finance_automation",
    audienceFilter: "individual",
    audienceMeta: {
      automation: true,
      triggerType: payload.triggerType,
      studentName: payload.studentName,
      message: payload.message
    },
    scheduledAt: null,
    sentAt: new Date(),
    status: "SENT",
    totalCount: 1,
    sentCount: 1,
    failedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: {
      id: template.id,
      name: `${template.name} (Automation)`,
      subject: template.subject,
      type: template.type,
      category: "FEE"
    },
    sentByName: "Finance Automation Engine"
  };

  campaigns.unshift(campaign);

  const channels: Array<"SMS" | "EMAIL"> = [];
  if (payload.guardianPhone) {
    channels.push("SMS");
  }
  if (payload.guardianEmail) {
    channels.push("EMAIL");
  }
  if (channels.length === 0) {
    channels.push("SMS");
  }

  for (const channel of channels) {
    deliveries.unshift({
      id: `del_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      campaignId,
      guardianId: `auto_guardian_${payload.dedupeKey}`,
      channel,
      status: "SENT",
      errorMessage: null,
      sentAt: new Date(),
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      guardianName: payload.guardianName,
      guardianPhone: payload.guardianPhone,
      guardianEmail: payload.guardianEmail
    });
  }

  automationDispatchKeys.add(payload.dedupeKey);
  return campaign;
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export function listDeliveries(campaignId?: string): MessageDelivery[] {
  const list = campaignId
    ? deliveries.filter(d => d.campaignId === campaignId)
    : deliveries;
  return [...list].sort(
    (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function getCommunicationsStats(): CommunicationsStats {
  const all = deliveries;
  const totalSent = all.filter(d => d.status !== "PENDING").length;
  const totalDelivered = all.filter(d => d.status === "DELIVERED").length;
  const totalFailed = all.filter(d => d.status === "FAILED").length;
  const totalPending = all.filter(d => d.status === "PENDING").length;
  const deliveryRate =
    totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  return {
    totalSent,
    totalDelivered,
    totalFailed,
    totalPending,
    deliveryRate,
    recentCampaigns: listCampaigns().slice(0, 5)
  };
}

// ─── Audience Resolution (mock) ───────────────────────────────────────────────

type MockGuardian = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
};

const MOCK_GUARDIANS: MockGuardian[] = [
  { id: "g_001", fullName: "David Mwangi", phoneNumber: "+254 712 345 678", email: "d.mwangi@gmail.com" },
  { id: "g_002", fullName: "Fatuma Hassan", phoneNumber: "+254 722 987 654", email: "f.hassan@gmail.com" },
  { id: "g_003", fullName: "Samuel Kariuki", phoneNumber: "+254 722 111 222", email: "s.kariuki@outlook.com" },
  { id: "g_004", fullName: "Mary Njoroge", phoneNumber: "+254 733 444 555", email: "mary.njoroge@yahoo.com" },
  { id: "g_005", fullName: "Peter Otieno", phoneNumber: "+254 701 223 344", email: "p.otieno@gmail.com" },
  { id: "g_006", fullName: "Grace Akinyi", phoneNumber: "+254 714 556 677", email: null },
  { id: "g_007", fullName: "John Kamau", phoneNumber: "+254 725 998 001", email: "j.kamau@gmail.com" }
];

function resolveAudience(filter: AudienceFilter): MockGuardian[] {
  switch (filter) {
    case "all":
      return MOCK_GUARDIANS;
    case "fee_overdue":
      return MOCK_GUARDIANS.slice(0, 4);
    case "attendance_concern":
      return MOCK_GUARDIANS.slice(3, 7);
    case "class":
    case "individual":
      return MOCK_GUARDIANS.slice(0, 3);
    default:
      return MOCK_GUARDIANS;
  }
}

// Re-export mock stats constant
export { MOCK_STATS };

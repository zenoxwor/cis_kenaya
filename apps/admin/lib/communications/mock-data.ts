import type {
  MessageTemplate,
  MessageCampaign,
  MessageDelivery,
  CommunicationsStats
} from "./types";

// ─── Mock Templates ────────────────────────────────────────────────────────

export const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl_fee_overdue",
    campusId: "campus_main",
    name: "Fee Overdue Reminder",
    subject: "Outstanding Fee Balance — Action Required",
    body: "Dear {{guardianName}}, this is a reminder that {{studentName}}'s school fees are overdue. Please settle the balance of KES {{amount}} by {{dueDate}}. Contact finance@ciskenya.ac.ke for assistance.",
    type: "BOTH",
    category: "FEE",
    isSystem: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10")
  },
  {
    id: "tpl_attendance_alert",
    campusId: "campus_main",
    name: "Attendance Alert",
    subject: "Attendance Concern — {{studentName}}",
    body: "Dear {{guardianName}}, we wish to inform you that {{studentName}} has been absent for {{streakDays}} consecutive school days. Please contact the school at +254 20 123 4567 or reception@ciskenya.ac.ke.",
    type: "BOTH",
    category: "ATTENDANCE",
    isSystem: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10")
  },
  {
    id: "tpl_term_start",
    campusId: "campus_main",
    name: "Term Start Notice",
    subject: "Term {{term}} Commencement — CIS Kenya",
    body: "Dear {{guardianName}}, we look forward to welcoming {{studentName}} back to Capital International School on {{startDate}}. Please ensure all fees are settled and required documents are submitted. Warm regards, CIS Kenya Administration.",
    type: "EMAIL",
    category: "GENERAL",
    isSystem: false,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01")
  },
  {
    id: "tpl_discipline_notice",
    campusId: "campus_main",
    name: "Discipline Notice",
    subject: "Discipline Notice — {{studentName}}",
    body: "Dear {{guardianName}}, we wish to bring to your attention a behavioural concern regarding {{studentName}}. Kindly contact the school to schedule a meeting with the class teacher. CIS Kenya Discipline Committee.",
    type: "BOTH",
    category: "DISCIPLINE",
    isSystem: false,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01")
  },
  {
    id: "tpl_event_invite",
    campusId: "campus_main",
    name: "School Event Invitation",
    subject: "Invitation: {{eventName}} — CIS Kenya",
    body: "Dear {{guardianName}}, you are cordially invited to {{eventName}} on {{eventDate}} at {{eventTime}}. Venue: Capital International School, Nairobi. We hope to see you there.",
    type: "EMAIL",
    category: "GENERAL",
    isSystem: false,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01")
  }
];

// ─── Mock Campaigns ────────────────────────────────────────────────────────

export const MOCK_CAMPAIGNS: MessageCampaign[] = [
  {
    id: "camp_001",
    campusId: "campus_main",
    templateId: "tpl_fee_overdue",
    sentById: "user_finance_01",
    audienceFilter: "fee_overdue",
    audienceMeta: null,
    scheduledAt: null,
    sentAt: new Date("2026-07-20T09:00:00"),
    status: "SENT",
    totalCount: 34,
    sentCount: 32,
    failedCount: 2,
    createdAt: new Date("2026-07-20T08:55:00"),
    updatedAt: new Date("2026-07-20T09:05:00"),
    template: { id: "tpl_fee_overdue", name: "Fee Overdue Reminder", subject: "Outstanding Fee Balance — Action Required", type: "BOTH", category: "FEE" },
    sentByName: "Amina Ochieng (Finance)"
  },
  {
    id: "camp_002",
    campusId: "campus_main",
    templateId: "tpl_attendance_alert",
    sentById: "user_reception_01",
    audienceFilter: "attendance_concern",
    audienceMeta: { streakDays: 3 },
    scheduledAt: null,
    sentAt: new Date("2026-07-22T08:30:00"),
    status: "SENT",
    totalCount: 7,
    sentCount: 7,
    failedCount: 0,
    createdAt: new Date("2026-07-22T08:25:00"),
    updatedAt: new Date("2026-07-22T08:35:00"),
    template: { id: "tpl_attendance_alert", name: "Attendance Alert", subject: "Attendance Concern", type: "BOTH", category: "ATTENDANCE" },
    sentByName: "Grace Wanjiku (Reception)"
  },
  {
    id: "camp_003",
    campusId: "campus_main",
    templateId: "tpl_term_start",
    sentById: "user_reception_01",
    audienceFilter: "all",
    audienceMeta: null,
    scheduledAt: new Date("2026-07-30T07:00:00"),
    sentAt: null,
    status: "SCHEDULED",
    totalCount: 0,
    sentCount: 0,
    failedCount: 0,
    createdAt: new Date("2026-07-28T10:00:00"),
    updatedAt: new Date("2026-07-28T10:00:00"),
    template: { id: "tpl_term_start", name: "Term Start Notice", subject: "Term Commencement — CIS Kenya", type: "EMAIL", category: "GENERAL" },
    sentByName: "Grace Wanjiku (Reception)"
  }
];

// ─── Mock Deliveries ───────────────────────────────────────────────────────

export const MOCK_DELIVERIES: MessageDelivery[] = [
  { id: "del_001", campaignId: "camp_001", guardianId: "g_001", channel: "EMAIL", status: "DELIVERED", errorMessage: null, sentAt: new Date("2026-07-20T09:01:00"), deliveredAt: new Date("2026-07-20T09:02:00"), createdAt: new Date("2026-07-20T09:01:00"), updatedAt: new Date("2026-07-20T09:02:00"), guardianName: "David Mwangi", guardianEmail: "d.mwangi@gmail.com" },
  { id: "del_002", campaignId: "camp_001", guardianId: "g_001", channel: "SMS", status: "DELIVERED", errorMessage: null, sentAt: new Date("2026-07-20T09:01:00"), deliveredAt: new Date("2026-07-20T09:03:00"), createdAt: new Date("2026-07-20T09:01:00"), updatedAt: new Date("2026-07-20T09:03:00"), guardianName: "David Mwangi", guardianPhone: "+254 712 345 678" },
  { id: "del_003", campaignId: "camp_001", guardianId: "g_002", channel: "EMAIL", status: "FAILED", errorMessage: "Mailbox does not exist", sentAt: new Date("2026-07-20T09:01:00"), deliveredAt: null, createdAt: new Date("2026-07-20T09:01:00"), updatedAt: new Date("2026-07-20T09:02:00"), guardianName: "Fatuma Hassan", guardianEmail: "f.hassan.old@yahoo.com" },
  { id: "del_004", campaignId: "camp_001", guardianId: "g_003", channel: "SMS", status: "DELIVERED", errorMessage: null, sentAt: new Date("2026-07-20T09:01:00"), deliveredAt: new Date("2026-07-20T09:04:00"), createdAt: new Date("2026-07-20T09:01:00"), updatedAt: new Date("2026-07-20T09:04:00"), guardianName: "Samuel Kariuki", guardianPhone: "+254 722 111 222" },
  { id: "del_005", campaignId: "camp_002", guardianId: "g_004", channel: "SMS", status: "SENT", errorMessage: null, sentAt: new Date("2026-07-22T08:31:00"), deliveredAt: null, createdAt: new Date("2026-07-22T08:31:00"), updatedAt: new Date("2026-07-22T08:31:00"), guardianName: "Mary Njoroge", guardianPhone: "+254 733 444 555" },
  { id: "del_006", campaignId: "camp_002", guardianId: "g_005", channel: "EMAIL", status: "DELIVERED", errorMessage: null, sentAt: new Date("2026-07-22T08:31:00"), deliveredAt: new Date("2026-07-22T08:32:00"), createdAt: new Date("2026-07-22T08:31:00"), updatedAt: new Date("2026-07-22T08:32:00"), guardianName: "Peter Otieno", guardianEmail: "p.otieno@gmail.com" }
];

// ─── Mock Stats ─────────────────────────────────────────────────────────────

export const MOCK_STATS: CommunicationsStats = {
  totalSent: 41,
  totalDelivered: 37,
  totalFailed: 2,
  totalPending: 2,
  deliveryRate: 90,
  recentCampaigns: MOCK_CAMPAIGNS
};

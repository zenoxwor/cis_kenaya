export type MessageType = "SMS" | "EMAIL" | "BOTH";
export type MessageCategory = "FEE" | "ATTENDANCE" | "DISCIPLINE" | "GENERAL";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENT" | "FAILED";
export type DeliveryChannel = "SMS" | "EMAIL";
export type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";

export type AudienceFilter =
  | "all"
  | "class"
  | "individual"
  | "fee_overdue"
  | "attendance_concern";

export type MessageTemplate = {
  id: string;
  campusId: string;
  name: string;
  subject: string | null;
  body: string;
  type: MessageType;
  category: MessageCategory;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageCampaign = {
  id: string;
  campusId: string;
  templateId: string;
  sentById: string;
  audienceFilter: AudienceFilter;
  audienceMeta: Record<string, unknown> | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: CampaignStatus;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
  template?: Pick<MessageTemplate, "id" | "name" | "subject" | "type" | "category">;
  sentByName?: string;
};

export type MessageDelivery = {
  id: string;
  campaignId: string;
  guardianId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  errorMessage: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
};

export type CommunicationsStats = {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  recentCampaigns: MessageCampaign[];
};

export type TriggerConfig = {
  feeOverdueEnabled: boolean;
  feeOverdueDaysThreshold: number;
  attendanceAlertEnabled: boolean;
  attendanceStreakThreshold: number;
};

export type ComposePayload = {
  templateId: string;
  audienceFilter: AudienceFilter;
  audienceMeta?: Record<string, unknown>;
  scheduledAt?: string;
};

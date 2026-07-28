export type AuditEventStatus = "success" | "failure" | "denied" | "warning";

export type AuditEventActor = {
  id: string | null;
  role: string | null;
  name: string | null;
  ipAddress: string | null;
};

export type AuditEvent = {
  id: string;
  actor: AuditEventActor;
  action: string;
  entity: string;
  entityId: string;
  module: string;
  status: AuditEventStatus;
  timestamp: string;
  metadata: Record<string, unknown>;
};

export type AuditEventInput = Omit<AuditEvent, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

export type OperationsHealthPanelData = {
  recentFailures: number;
  recentRetries: number;
  alertStatuses: Array<{
    key: string;
    status: "ok" | "warning";
    count: number;
    lastTriggeredAt: string | null;
  }>;
};


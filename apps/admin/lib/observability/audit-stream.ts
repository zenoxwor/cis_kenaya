import { sendProviderEvent } from "@/lib/observability/provider-hooks";
import type { AuditEvent, AuditEventInput, OperationsHealthPanelData } from "@/lib/observability/types";

const auditEvents: AuditEvent[] = [];
let seeded = false;

const FAILED_SIGNIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_SIGNIN_THRESHOLD = 3;
const ACCESS_DENIED_WINDOW_MS = 10 * 60 * 1000;
const ACCESS_DENIED_THRESHOLD = 6;

function toTimestamp(value: string) {
  return new Date(value).getTime();
}

function normalizeEvent(event: AuditEventInput): AuditEvent {
  return {
    id: event.id ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: event.timestamp ?? new Date().toISOString(),
    actor: {
      id: event.actor.id ?? null,
      role: event.actor.role ?? null,
      name: event.actor.name ?? null,
      ipAddress: event.actor.ipAddress ?? null
    },
    action: event.action,
    entity: event.entity,
    entityId: event.entityId,
    module: event.module,
    status: event.status,
    metadata: event.metadata ?? {}
  };
}

function appendEvent(input: AuditEventInput, evaluateSignals: boolean) {
  const event = normalizeEvent(input);
  auditEvents.unshift(event);
  console.info("[audit-event]", JSON.stringify(event));
  sendProviderEvent(event);

  if (evaluateSignals) {
    evaluateSecuritySignals(event);
  }

  return event;
}

function countEventsInWindow(predicate: (event: AuditEvent) => boolean, windowMs: number, at: number) {
  const floor = at - windowMs;
  return auditEvents.filter(event => {
    const ts = toTimestamp(event.timestamp);
    return ts >= floor && ts <= at && predicate(event);
  }).length;
}

function evaluateSecuritySignals(event: AuditEvent) {
  const eventTime = toTimestamp(event.timestamp);

  if (event.action === "auth.sign_in" && event.status === "failure") {
    const failedKey =
      event.actor.id ??
      String(event.metadata.username ?? event.actor.name ?? event.actor.ipAddress ?? "unknown");
    const failures = countEventsInWindow(
      candidate =>
        candidate.action === "auth.sign_in" &&
        candidate.status === "failure" &&
        (candidate.actor.id ??
          String(
            candidate.metadata.username ?? candidate.actor.name ?? candidate.actor.ipAddress ?? "unknown"
          )) === failedKey,
      FAILED_SIGNIN_WINDOW_MS,
      eventTime
    );

    if (failures === FAILED_SIGNIN_THRESHOLD) {
      appendEvent(
        {
          actor: event.actor,
          action: "security.failed_signin_threshold",
          entity: "Authentication",
          entityId: failedKey,
          module: "security",
          status: "warning",
          metadata: {
            threshold: FAILED_SIGNIN_THRESHOLD,
            windowMinutes: FAILED_SIGNIN_WINDOW_MS / 60000,
            failures
          }
        },
        false
      );
    }
  }

  if (event.status === "denied" || event.action === "rbac.access_denied") {
    const denials = countEventsInWindow(
      candidate => candidate.status === "denied" || candidate.action === "rbac.access_denied",
      ACCESS_DENIED_WINDOW_MS,
      eventTime
    );

    if (denials === ACCESS_DENIED_THRESHOLD) {
      appendEvent(
        {
          actor: event.actor,
          action: "security.access_denied_spike",
          entity: "AccessControl",
          entityId: "rbac",
          module: "security",
          status: "warning",
          metadata: {
            threshold: ACCESS_DENIED_THRESHOLD,
            windowMinutes: ACCESS_DENIED_WINDOW_MS / 60000,
            denials
          }
        },
        false
      );
    }
  }
}

export function initializeAuditStream(seedEvents: AuditEvent[]) {
  if (seeded) {
    return;
  }

  const sorted = [...seedEvents].sort((a, b) => toTimestamp(b.timestamp) - toTimestamp(a.timestamp));
  for (const event of sorted) {
    appendEvent(event, false);
  }

  seeded = true;
}

export function logAuditEvent(event: AuditEventInput) {
  return appendEvent(event, true);
}

export function listAuditEvents() {
  return [...auditEvents].sort((a, b) => toTimestamp(b.timestamp) - toTimestamp(a.timestamp));
}

export function getOperationsHealthData(): OperationsHealthPanelData {
  const now = Date.now();
  const window24h = now - 24 * 60 * 60 * 1000;
  const recentEvents = auditEvents.filter(event => toTimestamp(event.timestamp) >= window24h);

  const recentFailures = recentEvents.filter(event => event.status === "failure").length;
  const recentRetries = recentEvents.filter(event => {
    const attempt = Number(event.metadata.attempt ?? 1);
    return attempt > 1 || event.action.includes("retry");
  }).length;

  const failedSigninSignals = recentEvents.filter(
    event => event.action === "security.failed_signin_threshold"
  );
  const deniedSpikeSignals = recentEvents.filter(event => event.action === "security.access_denied_spike");

  const alertStatuses: OperationsHealthPanelData["alertStatuses"] = [
    {
      key: "Repeated failed sign-ins",
      status: failedSigninSignals.length > 0 ? "warning" : "ok",
      count: failedSigninSignals.length,
      lastTriggeredAt: failedSigninSignals[0]?.timestamp ?? null
    },
    {
      key: "Access denied spikes",
      status: deniedSpikeSignals.length > 0 ? "warning" : "ok",
      count: deniedSpikeSignals.length,
      lastTriggeredAt: deniedSpikeSignals[0]?.timestamp ?? null
    }
  ];

  return {
    recentFailures,
    recentRetries,
    alertStatuses
  };
}


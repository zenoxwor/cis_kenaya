import type { AuditEvent } from "@/lib/observability/types";

export type ProviderErrorContext = {
  code: string;
  statusCode: number;
  details?: unknown;
  metadata?: Record<string, unknown>;
};

export type ObservabilityProvider = {
  captureException?: (error: Error, context: ProviderErrorContext) => void | Promise<void>;
  captureEvent?: (event: AuditEvent) => void | Promise<void>;
};

let provider: ObservabilityProvider | null = null;

export function setObservabilityProvider(nextProvider: ObservabilityProvider | null) {
  provider = nextProvider;
}

export function getObservabilityProvider() {
  return provider;
}

export function sendProviderEvent(event: AuditEvent) {
  const currentProvider = getObservabilityProvider();
  if (!currentProvider?.captureEvent) {
    return;
  }

  Promise.resolve(currentProvider.captureEvent(event)).catch(error => {
    console.error("Observability provider failed to capture event.", error);
  });
}

export function sendProviderError(error: Error, context: ProviderErrorContext) {
  const currentProvider = getObservabilityProvider();
  if (!currentProvider?.captureException) {
    return;
  }

  Promise.resolve(currentProvider.captureException(error, context)).catch(providerError => {
    console.error("Observability provider failed to capture exception.", providerError);
  });
}


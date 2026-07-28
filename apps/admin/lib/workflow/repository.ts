import { seedWorkflowRecords } from "@/lib/workflow/mock-data";
import type { WorkflowApplicationRecord } from "@/lib/workflow/types";

export interface AdmissionsWorkflowRepository {
  list(): Promise<WorkflowApplicationRecord[]>;
  save(records: WorkflowApplicationRecord[]): Promise<void>;
}

export class BrowserWorkflowRepository implements AdmissionsWorkflowRepository {
  private readonly storageKey = "kenya.workflow.records";

  async list() {
    if (typeof window === "undefined") {
      return seedWorkflowRecords;
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return seedWorkflowRecords;
    }

    try {
      return JSON.parse(raw) as WorkflowApplicationRecord[];
    } catch (error) {
      console.warn("Failed to parse workflow records from localStorage.", error);
      return seedWorkflowRecords;
    }
  }

  async save(records: WorkflowApplicationRecord[]) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(records));
  }
}

export function createWorkflowRepository() {
  return new BrowserWorkflowRepository();
}

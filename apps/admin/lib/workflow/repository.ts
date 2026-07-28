import { seedWorkflowRecords } from "@/lib/workflow/mock-data";
import type { WorkflowApplicationRecord } from "@/lib/workflow/types";
import { AppError } from "@/lib/observability/app-error";

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
      console.error("Failed to parse workflow records from localStorage.", error);
      throw new AppError("Workflow records are corrupted in local storage.", {
        code: "WORKFLOW_STORAGE_PARSE_ERROR",
        statusCode: 500,
        details: error
      });
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

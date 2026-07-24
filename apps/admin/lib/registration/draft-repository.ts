import { APPLICATION_STATUSES } from "@/lib/registration/statuses";
import type { RegistrationDraft } from "@/lib/registration/types";

const DRAFT_PREFIX = "kenaya.registration.draft.";

export const REQUIRED_DOCUMENT_TYPES = [
  "Birth Certificate",
  "Guardian ID",
  "Previous Report Card"
] as const;

export interface RegistrationDraftRepository {
  load(draftId: string): Promise<RegistrationDraft | null>;
  save(draft: RegistrationDraft): Promise<void>;
  clear(draftId: string): Promise<void>;
}

class BrowserLocalDraftRepository implements RegistrationDraftRepository {
  async load(draftId: string) {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${draftId}`);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as RegistrationDraft;
    } catch (error) {
      console.warn("Failed to parse stored registration draft.", error);
      return null;
    }
  }

  async save(draft: RegistrationDraft) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(`${DRAFT_PREFIX}${draft.id}`, JSON.stringify(draft));
  }

  async clear(draftId: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(`${DRAFT_PREFIX}${draftId}`);
  }
}

export function createDraftRepository(): RegistrationDraftRepository {
  return new BrowserLocalDraftRepository();
}

export function createDraftId() {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function createDraftNumber(now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `APP-${yyyy}${mm}${dd}-${hh}${min}-${suffix}`;
}

export function createInitialRegistrationDraft(draftId?: string): RegistrationDraft {
  const nowIso = new Date().toISOString();

  return {
    id: draftId ?? createDraftId(),
    applicationNo: createDraftNumber(),
    currentStep: 1,
    applicationStatus: APPLICATION_STATUSES[0],
    submittedAt: null,
    student: {
      firstName: "",
      lastName: "",
      preferredName: "",
      dateOfBirth: "",
      nationality: "",
      gender: "",
      studentStatus: "PROSPECT"
    },
    guardian: {
      guardianFullName: "",
      guardianRelationship: "",
      guardianEmail: "",
      guardianPhone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      addressLine1: "",
      city: "",
      country: ""
    },
    academic: {
      currentSchool: "",
      currentGrade: "",
      appliedGrade: "",
      academicYear: "",
      notes: ""
    },
    medical: {
      allergies: "",
      medications: "",
      supportNeeds: "",
      physicianContact: "",
      medicalConsentConfirmed: false
    },
    documents: [],
    paymentSnapshot: {
      status: "PENDING",
      amountMinor: 0,
      currencyCode: "USD",
      notes: ""
    },
    review: {
      notes: "",
      termsConfirmed: false
    },
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

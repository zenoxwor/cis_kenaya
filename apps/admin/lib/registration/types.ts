import type {
  ApplicationStatus,
  DocumentStatus,
  PaymentStatus,
  StudentStatus
} from "@/lib/registration/statuses";

export const REGISTRATION_STEPS = [
  "student_profile",
  "guardian_contacts",
  "academic_placement",
  "medical_support",
  "documents_upload",
  "review_submit"
] as const;

export type RegistrationStepId = (typeof REGISTRATION_STEPS)[number];

export type StudentProfileDraft = {
  firstName: string;
  lastName: string;
  preferredName: string;
  dateOfBirth: string;
  nationality: string;
  gender: string;
  studentStatus: StudentStatus;
};

export type GuardianContactsDraft = {
  guardianFullName: string;
  guardianRelationship: string;
  guardianEmail: string;
  guardianPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  addressLine1: string;
  city: string;
  country: string;
};

export type AcademicPlacementDraft = {
  currentSchool: string;
  currentGrade: string;
  appliedGrade: string;
  academicYear: string;
  notes: string;
};

export type MedicalSupportDraft = {
  allergies: string;
  medications: string;
  supportNeeds: string;
  physicianContact: string;
  medicalConsentConfirmed: boolean;
};

export type UploadedDocumentDraft = {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  status: DocumentStatus;
};

export type PaymentSnapshotDraft = {
  status: PaymentStatus;
  amountMinor: number;
  currencyCode: string;
  notes: string;
};

export type RegistrationDraft = {
  id: string;
  applicationNo: string;
  currentStep: number;
  applicationStatus: ApplicationStatus;
  submittedAt: string | null;
  student: StudentProfileDraft;
  guardian: GuardianContactsDraft;
  academic: AcademicPlacementDraft;
  medical: MedicalSupportDraft;
  documents: UploadedDocumentDraft[];
  paymentSnapshot: PaymentSnapshotDraft;
  review: {
    notes: string;
    termsConfirmed: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

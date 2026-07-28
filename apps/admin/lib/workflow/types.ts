import type { AppRole } from "@/lib/rbac/roles";
import type {
  ApplicationStatus,
  DocumentStatus,
  EnrollmentStatus,
  InvoiceStatus,
  PaymentStatus,
  StudentStatus
} from "@/lib/registration/statuses";

export type WorkflowDocument = {
  id: string;
  type: string;
  required: boolean;
  status: DocumentStatus;
};

export type WorkflowFinanceSnapshot = {
  invoiceNo: string | null;
  invoiceStatus: InvoiceStatus;
  amountMinor: number;
  paidMinor: number;
  paymentStatus: PaymentStatus;
};

export type WorkflowEvent = {
  at: string;
  actorRole: AppRole;
  message: string;
};

export type WorkflowApplicationRecord = {
  id: string;
  applicationNo: string;
  studentName: string;
  appliedGrade: string;
  ownerName: string;
  applicationStatus: ApplicationStatus;
  studentStatus: StudentStatus;
  enrollmentStatus: EnrollmentStatus;
  documents: WorkflowDocument[];
  finance: WorkflowFinanceSnapshot;
  updatedAt: string;
  events: WorkflowEvent[];
};

export type WorkflowActionId =
  | "submit_application"
  | "request_documents"
  | "verify_documents"
  | "send_for_review"
  | "schedule_interview"
  | "approve_application"
  | "reject_application"
  | "waitlist_application"
  | "issue_invoice"
  | "record_payment"
  | "convert_enrollment"
  | "override_approve"
  | "override_reject";

export type WorkflowAction = {
  id: WorkflowActionId;
  label: string;
};

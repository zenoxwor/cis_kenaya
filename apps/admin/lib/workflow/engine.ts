import { canPerformAction } from "@/lib/rbac/permissions";
import { ROLE, type AppRole } from "@/lib/rbac/roles";
import type { WorkflowAction, WorkflowActionId, WorkflowApplicationRecord } from "@/lib/workflow/types";

const ACTION_LABELS: Record<WorkflowActionId, string> = {
  submit_application: "Submit",
  request_documents: "Request documents",
  verify_documents: "Verify documents",
  send_for_review: "Send for review",
  schedule_interview: "Schedule interview",
  approve_application: "Approve",
  reject_application: "Reject",
  waitlist_application: "Waitlist",
  issue_invoice: "Issue invoice",
  record_payment: "Record payment",
  convert_enrollment: "Convert to enrollment",
  override_approve: "Override approve",
  override_reject: "Override reject"
};

function withEvent(
  record: WorkflowApplicationRecord,
  role: AppRole,
  message: string
): WorkflowApplicationRecord {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    events: [{ at: new Date().toISOString(), actorRole: role, message }, ...record.events].slice(0, 15)
  };
}

function hasRequiredDocsVerified(record: WorkflowApplicationRecord) {
  return record.documents
    .filter(doc => doc.required)
    .every(doc => doc.status === "VERIFIED");
}

export function getAvailableWorkflowActions(
  role: AppRole,
  record: WorkflowApplicationRecord
): WorkflowAction[] {
  const actions: WorkflowActionId[] = [];

  if (
    role === ROLE.RECEPTION &&
    record.applicationStatus === "DRAFT" &&
    canPerformAction(role, "application", "create")
  ) {
    actions.push("submit_application");
  }

  if (
    role === ROLE.RECEPTION &&
    ["SUBMITTED", "UNDER_REVIEW"].includes(record.applicationStatus) &&
    canPerformAction(role, "student_document", "edit")
  ) {
    actions.push("request_documents");
  }

  if (
    role === ROLE.RECEPTION &&
    ["DOCUMENTS_PENDING", "SUBMITTED"].includes(record.applicationStatus) &&
    canPerformAction(role, "student_document", "approve")
  ) {
    actions.push("verify_documents", "send_for_review");
  }

  if (
    role === ROLE.PRINCIPAL &&
    ["UNDER_REVIEW", "INTERVIEW_SCHEDULED"].includes(record.applicationStatus) &&
    canPerformAction(role, "application", "approve")
  ) {
    actions.push("approve_application", "reject_application", "waitlist_application");
  }

  if (
    role === ROLE.PRINCIPAL &&
    record.applicationStatus === "UNDER_REVIEW" &&
    canPerformAction(role, "application", "approve")
  ) {
    actions.push("schedule_interview");
  }

  if (
    role === ROLE.FINANCE &&
    record.applicationStatus === "APPROVED" &&
    record.finance.invoiceStatus === "DRAFT" &&
    canPerformAction(role, "fee_invoice", "create")
  ) {
    actions.push("issue_invoice");
  }

  if (
    role === ROLE.FINANCE &&
    ["ISSUED", "PARTIALLY_PAID"].includes(record.finance.invoiceStatus) &&
    canPerformAction(role, "payment", "approve")
  ) {
    actions.push("record_payment");
  }

  if (
    ([ROLE.SUPER_ADMIN, ROLE.PRINCIPAL] as string[]).includes(role) &&
    record.applicationStatus === "APPROVED" &&
    record.finance.paymentStatus === "SETTLED" &&
    record.enrollmentStatus === "OFFERED"
  ) {
    actions.push("convert_enrollment");
  }

  if (role === ROLE.SUPER_ADMIN && canPerformAction(role, "application", "override")) {
    if (record.applicationStatus !== "APPROVED") {
      actions.push("override_approve");
    }

    if (record.applicationStatus !== "REJECTED") {
      actions.push("override_reject");
    }
  }

  return actions.map(actionId => ({ id: actionId, label: ACTION_LABELS[actionId] }));
}

export function applyWorkflowAction(
  role: AppRole,
  actionId: WorkflowActionId,
  record: WorkflowApplicationRecord
) {
  const allowed = getAvailableWorkflowActions(role, record).some(action => action.id === actionId);
  if (!allowed) {
    throw new Error("This action is not allowed for the selected role or record status.");
  }

  if (actionId === "submit_application") {
    return withEvent(
      {
        ...record,
        applicationStatus: "SUBMITTED",
        studentStatus: "APPLICANT"
      },
      role,
      "Application submitted and moved to SUBMITTED."
    );
  }

  if (actionId === "request_documents") {
    return withEvent(
      {
        ...record,
        applicationStatus: "DOCUMENTS_PENDING"
      },
      role,
      "Required documents requested from guardian."
    );
  }

  if (actionId === "verify_documents") {
    const documents = record.documents.map(document => ({
      ...document,
      status: document.required ? "VERIFIED" : document.status
    }));

    const nextStatus = hasRequiredDocsVerified({ ...record, documents }) ? "UNDER_REVIEW" : "DOCUMENTS_PENDING";

    return withEvent(
      {
        ...record,
        documents,
        applicationStatus: nextStatus
      },
      role,
      "Required documents marked VERIFIED."
    );
  }

  if (actionId === "send_for_review") {
    return withEvent(
      {
        ...record,
        applicationStatus: "UNDER_REVIEW"
      },
      role,
      "Application routed to principal review queue."
    );
  }

  if (actionId === "schedule_interview") {
    return withEvent(
      {
        ...record,
        applicationStatus: "INTERVIEW_SCHEDULED"
      },
      role,
      "Interview scheduled with applicant and guardian."
    );
  }

  if (actionId === "approve_application" || actionId === "override_approve") {
    return withEvent(
      {
        ...record,
        applicationStatus: "APPROVED"
      },
      role,
      actionId === "override_approve"
        ? "Application force-approved by Super Admin override."
        : "Application approved."
    );
  }

  if (actionId === "reject_application" || actionId === "override_reject") {
    return withEvent(
      {
        ...record,
        applicationStatus: "REJECTED"
      },
      role,
      actionId === "override_reject"
        ? "Application force-rejected by Super Admin override."
        : "Application rejected."
    );
  }

  if (actionId === "waitlist_application") {
    return withEvent(
      {
        ...record,
        applicationStatus: "WAITLISTED"
      },
      role,
      "Application moved to waitlist."
    );
  }

  if (actionId === "issue_invoice") {
    const invoiceNo = record.finance.invoiceNo ?? `INV-${record.applicationNo.slice(-6)}`;
    return withEvent(
      {
        ...record,
        finance: {
          ...record.finance,
          invoiceNo,
          invoiceStatus: "ISSUED",
          paymentStatus: "PENDING"
        }
      },
      role,
      `Enrollment invoice ${invoiceNo} issued.`
    );
  }

  if (actionId === "record_payment") {
    return withEvent(
      {
        ...record,
        finance: {
          ...record.finance,
          paidMinor: record.finance.amountMinor,
          invoiceStatus: "PAID",
          paymentStatus: "SETTLED"
        }
      },
      role,
      "Payment recorded and invoice marked PAID."
    );
  }

  return withEvent(
    {
      ...record,
      enrollmentStatus: "ENROLLED",
      studentStatus: "ENROLLED"
    },
    role,
    "Applicant converted to enrolled student."
  );
}

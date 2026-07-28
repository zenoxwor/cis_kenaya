import { REQUIRED_DOCUMENT_TYPES } from "@/lib/registration/draft-repository";
import type { RegistrationDraft, RegistrationStepId } from "@/lib/registration/types";

export type StepErrors = Record<string, string>;

export function validateRegistrationStep(step: RegistrationStepId, draft: RegistrationDraft): StepErrors {
  if (step === "student_profile") {
    return {
      ...(draft.student.firstName.trim() ? {} : { firstName: "First name is required." }),
      ...(draft.student.lastName.trim() ? {} : { lastName: "Last name is required." }),
      ...(draft.student.dateOfBirth.trim() ? {} : { dateOfBirth: "Date of birth is required." }),
      ...(draft.student.nationality.trim() ? {} : { nationality: "Nationality is required." })
    };
  }

  if (step === "guardian_contacts") {
    return {
      ...(draft.guardian.guardianFullName.trim()
        ? {}
        : { guardianFullName: "Guardian full name is required." }),
      ...(draft.guardian.guardianPhone.trim() ? {} : { guardianPhone: "Guardian phone is required." }),
      ...(draft.guardian.guardianRelationship.trim()
        ? {}
        : { guardianRelationship: "Relationship is required." }),
      ...(draft.guardian.emergencyContactName.trim()
        ? {}
        : { emergencyContactName: "Emergency contact name is required." }),
      ...(draft.guardian.emergencyContactPhone.trim()
        ? {}
        : { emergencyContactPhone: "Emergency contact phone is required." })
    };
  }

  if (step === "academic_placement") {
    return {
      ...(draft.academic.currentSchool.trim() ? {} : { currentSchool: "Current school is required." }),
      ...(draft.academic.currentGrade.trim() ? {} : { currentGrade: "Current grade is required." }),
      ...(draft.academic.appliedGrade.trim() ? {} : { appliedGrade: "Applied grade is required." }),
      ...(draft.academic.academicYear.trim() ? {} : { academicYear: "Academic year is required." })
    };
  }

  if (step === "medical_support") {
    return draft.medical.medicalConsentConfirmed
      ? {}
      : { medicalConsentConfirmed: "Medical declaration consent must be confirmed." };
  }

  if (step === "documents_upload") {
    const uploadedTypes = new Set(draft.documents.map(doc => doc.type));
    const missing = REQUIRED_DOCUMENT_TYPES.filter(required => !uploadedTypes.has(required));
    return missing.length > 0 ? { documents: `Missing required documents: ${missing.join(", ")}` } : {};
  }

  return draft.review.termsConfirmed
    ? {}
    : { termsConfirmed: "You must confirm terms before final submission." };
}

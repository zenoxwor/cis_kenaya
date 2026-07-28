"use client";

import { useEffect, useMemo, useState } from "react";
import { REQUIRED_DOCUMENT_TYPES, createDraftRepository, createInitialRegistrationDraft } from "@/lib/registration/draft-repository";
import { APPLICATION_STATUSES, DOCUMENT_STATUSES, STUDENT_STATUSES } from "@/lib/registration/statuses";
import { REGISTRATION_STEPS, type RegistrationDraft } from "@/lib/registration/types";
import { validateRegistrationStep } from "@/lib/registration/validation";
import { WizardProgress } from "@/components/registration/wizard-progress";

type RegistrationWizardProps = {
  initialDraftId?: string;
};

const STEP_LABELS = [
  "Student profile and identity",
  "Guardian and emergency contacts",
  "Academic history and placement",
  "Medical and special support needs",
  "Documents upload and verification",
  "Review, consent, and submission"
] as const;

const SHORT_STEP_LABELS = ["Profile", "Guardian", "Academic", "Medical", "Documents", "Review"] as const;

type WizardNotice = {
  type: "success" | "error" | "info";
  message: string;
};

export function RegistrationWizard({ initialDraftId }: RegistrationWizardProps) {
  const repository = useMemo(() => createDraftRepository(), []);
  const [draft, setDraft] = useState<RegistrationDraft>(() =>
    createInitialRegistrationDraft(initialDraftId)
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>(REQUIRED_DOCUMENT_TYPES[0]);
  const [notice, setNotice] = useState<WizardNotice | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateDraft() {
      const activeDraftId = initialDraftId ?? draft.id;
      const stored = await repository.load(activeDraftId);
      if (!isMounted) {
        return;
      }

      if (stored) {
        setDraft(stored);
        setCurrentStep(Math.min(Math.max(stored.currentStep, 1), REGISTRATION_STEPS.length));
      } else if (initialDraftId && initialDraftId !== draft.id) {
        const seeded = createInitialRegistrationDraft(initialDraftId);
        setDraft(seeded);
        setCurrentStep(1);
      }

      setLoading(false);
    }

    hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, [draft.id, initialDraftId, repository]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      const updatedDraft: RegistrationDraft = {
        ...draft,
        currentStep,
        updatedAt: new Date().toISOString()
      };
      repository.save(updatedDraft).catch(error => {
        console.warn("Failed to persist draft locally.", error);
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentStep, draft, loading, repository]);

  const currentStepId = REGISTRATION_STEPS[currentStep - 1];

  function updateDraft(mutator: (prev: RegistrationDraft) => RegistrationDraft) {
    setDraft(prev => ({
      ...mutator(prev),
      updatedAt: new Date().toISOString()
    }));
  }

  function handleNext() {
    const stepErrors = validateRegistrationStep(currentStepId, draft);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setNotice({ type: "error", message: "Please fix highlighted issues before continuing." });
      return;
    }

    setNotice(null);
    setCurrentStep(prev => Math.min(prev + 1, REGISTRATION_STEPS.length));
  }

  function handlePrevious() {
    setNotice(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }

  async function handleSaveDraft() {
    await repository.save({
      ...draft,
      currentStep,
      updatedAt: new Date().toISOString()
    });
    setNotice({ type: "success", message: "Draft saved locally." });
  }

  function handleClearDraft() {
    repository.clear(draft.id).catch(error => {
      console.warn("Failed to clear draft.", error);
    });
    const fresh = createInitialRegistrationDraft();
    setDraft(fresh);
    setCurrentStep(1);
    setErrors({});
    setNotice({ type: "info", message: "Started a fresh draft." });
  }

  function handleUploadDocuments(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const uploadedAt = new Date().toISOString();
    const docs = Array.from(fileList).map(file => ({
      id: `${uploadedAt}-${file.name}-${file.size}`,
      type: selectedDocumentType,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedAt,
      status: DOCUMENT_STATUSES[1]
    }));

    updateDraft(prev => ({
      ...prev,
      applicationStatus: "DOCUMENTS_PENDING",
      documents: [...prev.documents, ...docs]
    }));
  }

  function handleSubmitApplication() {
    const stepErrors = validateRegistrationStep("review_submit", draft);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setNotice({ type: "error", message: "Review checklist must be completed before submission." });
      return;
    }

    updateDraft(prev => ({
      ...prev,
      applicationStatus: APPLICATION_STATUSES[1],
      submittedAt: new Date().toISOString(),
      student: {
        ...prev.student,
        studentStatus: STUDENT_STATUSES[1]
      }
    }));
    setNotice({ type: "success", message: "Application marked as submitted." });
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.applicationNo.toLowerCase()}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  async function handleExportPdf() {
    setNotice({ type: "info", message: "Requesting PDF export hook..." });
    const response = await fetch("/api/registration/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: draft.id, applicationNo: draft.applicationNo })
    });

    if (!response.ok) {
      setNotice({
        type: "info",
        message: "PDF export endpoint is a placeholder; wire server PDF generation in next milestone."
      });
      return;
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${draft.applicationNo.toLowerCase()}.pdf`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  if (loading) {
    return <section className="admin-content-card text-sm text-slate-600">Loading draft...</section>;
  }

  return (
    <section className="space-y-4">
      {/* Wizard header – mirrors public wizard header style */}
      <header className="admin-content-card overflow-hidden">
        <div className="rounded-lg bg-gradient-to-br from-brand-50 to-white px-5 py-5 -mx-5 -mt-5 mb-4 border-b border-brand-100">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Admissions Intake</p>
          <h1 className="mt-1.5 text-2xl font-bold text-slate-900">Student Registration &amp; Documentation</h1>
          <p className="mt-1 text-sm text-slate-500">Complete all 6 steps to register the student. Progress is saved automatically.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700">Draft:</span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">{draft.id.slice(0, 12)}…</code>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700">Ref:</span>
            <span className="font-medium text-brand-700">{draft.applicationNo}</span>
          </span>
          <span
            className={[
              "rounded-full border px-2 py-0.5 font-semibold",
              draft.applicationStatus === "SUBMITTED" || draft.applicationStatus === "APPROVED"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : draft.applicationStatus === "REJECTED"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-brand-200 bg-brand-50 text-brand-700"
            ].join(" ")}
          >
            {draft.applicationStatus}
          </span>
        </div>
      </header>

      <WizardProgress labels={[...STEP_LABELS]} shortLabels={[...SHORT_STEP_LABELS]} currentStep={currentStep} />

      {notice && (
        <div
          role="alert"
          className={[
            "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium shadow-sm",
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-brand-100 bg-brand-50 text-brand-700"
          ].join(" ")}
        >
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-base">
            {notice.type === "error" ? "⚠" : notice.type === "success" ? "✓" : "ℹ"}
          </span>
          {notice.message}
        </div>
      )}

      <div className="admin-content-card space-y-6">
        {/* Animated step content – key forces remount on step change */}
        <div className="wizard-step-enter" key={currentStep}>
          {currentStep === 1 && (
            <StepStudentProfile
              draft={draft}
              errors={errors}
              onChange={(key, value) =>
                updateDraft(prev => ({
                  ...prev,
                  student: { ...prev.student, [key]: value }
                }))
              }
            />
          )}

          {currentStep === 2 && (
            <StepGuardianContacts
              draft={draft}
              errors={errors}
              onChange={(key, value) =>
                updateDraft(prev => ({
                  ...prev,
                  guardian: { ...prev.guardian, [key]: value }
                }))
              }
            />
          )}

          {currentStep === 3 && (
            <StepAcademicPlacement
              draft={draft}
              errors={errors}
              onChange={(key, value) =>
                updateDraft(prev => ({
                  ...prev,
                  academic: { ...prev.academic, [key]: value }
                }))
              }
            />
          )}

          {currentStep === 4 && (
            <StepMedicalSupport
              draft={draft}
              errors={errors}
              onChange={(key, value) =>
                updateDraft(prev => ({
                  ...prev,
                  medical: { ...prev.medical, [key]: value }
                }))
              }
            />
          )}

          {currentStep === 5 && (
            <StepDocumentsUpload
              draft={draft}
              errors={errors}
              selectedType={selectedDocumentType}
              onTypeChange={setSelectedDocumentType}
              onFilesSelected={handleUploadDocuments}
              onStatusChange={(documentId, status) =>
                updateDraft(prev => ({
                  ...prev,
                  documents: prev.documents.map(document =>
                    document.id === documentId ? { ...document, status } : document
                  )
                }))
              }
            />
          )}

          {currentStep === 6 && (
            <StepReviewSubmit
              draft={draft}
              errors={errors}
              onTermsChange={value =>
                updateDraft(prev => ({
                  ...prev,
                  review: { ...prev.review, termsConfirmed: value }
                }))
              }
              onNotesChange={value =>
                updateDraft(prev => ({
                  ...prev,
                  review: { ...prev.review, notes: value }
                }))
              }
            />
          )}
        </div>

        {/* Form actions: utility buttons + primary navigation CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          {/* Utility buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={handleSaveDraft}
              type="button"
            >
              Save draft
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={handleClearDraft}
              type="button"
            >
              New draft
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={handleExportJson}
              type="button"
            >
              Export JSON
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={handlePrint}
              type="button"
            >
              Print
            </button>
            <button
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              onClick={handleExportPdf}
              type="button"
            >
              Export PDF
            </button>
          </div>

          {/* Primary navigation CTAs – styled like public wizard */}
          <div className="flex gap-3">
            <button
              className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentStep === 1}
              onClick={handlePrevious}
              type="button"
            >
              ← Previous
            </button>
            {currentStep < REGISTRATION_STEPS.length ? (
              <button
                className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-all hover:-translate-y-px hover:shadow-md hover:shadow-brand-500/30"
                onClick={handleNext}
                type="button"
              >
                Next →
              </button>
            ) : (
              <button
                className="rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:-translate-y-px hover:shadow-md hover:shadow-emerald-500/30"
                onClick={handleSubmitApplication}
                type="button"
              >
                Complete Registration ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type SharedStepProps = {
  draft: RegistrationDraft;
  errors: Record<string, string>;
};

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return (
    <p className="flex items-center gap-1 text-xs font-medium text-red-600" role="alert">
      <span aria-hidden="true">⚠</span>
      {error}
    </p>
  );
}

/** Shared input/label classes */
const inputBase =
  "w-full rounded-xl border-2 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10";
const inputError = "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/10";
const inputNormal = "border-slate-200";
const labelBase = "mb-1.5 block text-sm font-semibold text-slate-800";

function TextInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelBase}>{props.label}</label>
      <input
        className={[inputBase, props.error ? inputError : inputNormal].join(" ")}
        onChange={event => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={props.value}
      />
      <FieldError error={props.error} />
    </div>
  );
}

function SelectInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelBase}>{props.label}</label>
      <select
        className={[inputBase, props.error ? inputError : inputNormal].join(" ")}
        onChange={event => props.onChange(event.target.value)}
        value={props.value}
      >
        <option value="">{props.placeholder ?? "Select…"}</option>
        {props.options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FieldError error={props.error} />
    </div>
  );
}

function TextAreaInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelBase}>{props.label}</label>
      <textarea
        className={[inputBase, "resize-y", props.error ? inputError : inputNormal].join(" ")}
        onChange={event => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        value={props.value}
      />
      <FieldError error={props.error} />
    </div>
  );
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-100 mb-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-300 text-sm font-bold text-white shadow-sm">
        {step}
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

function StepStudentProfile({
  draft,
  errors,
  onChange
}: SharedStepProps & { onChange: (key: keyof RegistrationDraft["student"], value: string) => void }) {
  return (
    <div className="space-y-5">
      <StepHeading step={1} title="Student Profile &amp; Identity" />
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput
          label="First name *"
          value={draft.student.firstName}
          onChange={value => onChange("firstName", value)}
          error={errors.firstName}
          placeholder="Enter first name"
        />
        <TextInput
          label="Last name *"
          value={draft.student.lastName}
          onChange={value => onChange("lastName", value)}
          error={errors.lastName}
          placeholder="Enter last name"
        />
        <TextInput
          label="Preferred / nickname"
          value={draft.student.preferredName}
          onChange={value => onChange("preferredName", value)}
          placeholder="Optional preferred name"
        />
        <TextInput
          label="Date of birth *"
          type="date"
          value={draft.student.dateOfBirth}
          onChange={value => onChange("dateOfBirth", value)}
          error={errors.dateOfBirth}
        />
        <TextInput
          label="Nationality *"
          value={draft.student.nationality}
          onChange={value => onChange("nationality", value)}
          error={errors.nationality}
          placeholder="e.g. Kenyan"
        />
        <SelectInput
          label="Gender"
          value={draft.student.gender}
          onChange={value => onChange("gender", value)}
          options={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "non-binary", label: "Non-binary" },
            { value: "prefer-not-to-say", label: "Prefer not to say" }
          ]}
          placeholder="Select gender"
        />
      </div>
    </div>
  );
}

function StepGuardianContacts({
  draft,
  errors,
  onChange
}: SharedStepProps & { onChange: (key: keyof RegistrationDraft["guardian"], value: string) => void }) {
  return (
    <div className="space-y-5">
      <StepHeading step={2} title="Guardian &amp; Emergency Contacts" />
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput
          label="Guardian full name *"
          value={draft.guardian.guardianFullName}
          onChange={value => onChange("guardianFullName", value)}
          error={errors.guardianFullName}
          placeholder="Enter full name"
        />
        <SelectInput
          label="Relationship to student *"
          value={draft.guardian.guardianRelationship}
          onChange={value => onChange("guardianRelationship", value)}
          error={errors.guardianRelationship}
          options={[
            { value: "father", label: "Father" },
            { value: "mother", label: "Mother" },
            { value: "uncle", label: "Uncle" },
            { value: "aunt", label: "Aunt" },
            { value: "grandfather", label: "Grandfather" },
            { value: "grandmother", label: "Grandmother" },
            { value: "legal-guardian", label: "Legal Guardian" },
            { value: "other", label: "Other" }
          ]}
          placeholder="Select relationship"
        />
        <TextInput
          label="Guardian email"
          type="email"
          value={draft.guardian.guardianEmail}
          onChange={value => onChange("guardianEmail", value)}
          placeholder="guardian@email.com"
        />
        <TextInput
          label="Guardian phone *"
          value={draft.guardian.guardianPhone}
          onChange={value => onChange("guardianPhone", value)}
          error={errors.guardianPhone}
          placeholder="+254 7XX XXX XXX"
        />
        <TextInput
          label="Emergency contact name *"
          value={draft.guardian.emergencyContactName}
          onChange={value => onChange("emergencyContactName", value)}
          error={errors.emergencyContactName}
          placeholder="Alternate emergency contact"
        />
        <TextInput
          label="Emergency contact phone *"
          value={draft.guardian.emergencyContactPhone}
          onChange={value => onChange("emergencyContactPhone", value)}
          error={errors.emergencyContactPhone}
          placeholder="+254 7XX XXX XXX"
        />
        <TextInput
          label="Address line"
          value={draft.guardian.addressLine1}
          onChange={value => onChange("addressLine1", value)}
          placeholder="Street / Building / Apartment"
        />
        <TextInput
          label="City"
          value={draft.guardian.city}
          onChange={value => onChange("city", value)}
          placeholder="City"
        />
        <TextInput
          label="Country"
          value={draft.guardian.country}
          onChange={value => onChange("country", value)}
          placeholder="Country"
        />
      </div>
    </div>
  );
}

function StepAcademicPlacement({
  draft,
  errors,
  onChange
}: SharedStepProps & { onChange: (key: keyof RegistrationDraft["academic"], value: string) => void }) {
  return (
    <div className="space-y-5">
      <StepHeading step={3} title="Academic History &amp; Placement" />
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput
          label="Current / previous school *"
          value={draft.academic.currentSchool}
          onChange={value => onChange("currentSchool", value)}
          error={errors.currentSchool}
          placeholder="Enter school name"
        />
        <TextInput
          label="Current grade *"
          value={draft.academic.currentGrade}
          onChange={value => onChange("currentGrade", value)}
          error={errors.currentGrade}
          placeholder="e.g. Grade 9"
        />
        <TextInput
          label="Applied grade *"
          value={draft.academic.appliedGrade}
          onChange={value => onChange("appliedGrade", value)}
          error={errors.appliedGrade}
          placeholder="e.g. Grade 10"
        />
        <TextInput
          label="Academic year *"
          value={draft.academic.academicYear}
          onChange={value => onChange("academicYear", value)}
          error={errors.academicYear}
          placeholder="e.g. 2024–2025"
        />
      </div>
      <TextAreaInput
        label="Placement notes"
        value={draft.academic.notes}
        onChange={value => onChange("notes", value)}
        placeholder="Additional context for academic placement…"
        rows={3}
      />
    </div>
  );
}

function StepMedicalSupport({
  draft,
  errors,
  onChange
}: SharedStepProps & {
  onChange: (key: keyof RegistrationDraft["medical"], value: string | boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeading step={4} title="Medical &amp; Special Support Needs" />
      <div className="grid gap-5 md:grid-cols-2">
        <TextInput
          label="Known allergies"
          value={draft.medical.allergies}
          onChange={value => onChange("allergies", value)}
          placeholder="e.g. Peanuts, Penicillin"
        />
        <TextInput
          label="Current medications"
          value={draft.medical.medications}
          onChange={value => onChange("medications", value)}
          placeholder="List medications if any"
        />
        <TextInput
          label="Special / support needs"
          value={draft.medical.supportNeeds}
          onChange={value => onChange("supportNeeds", value)}
          placeholder="e.g. Learning support, mobility aid"
        />
        <TextInput
          label="Physician / doctor contact"
          value={draft.medical.physicianContact}
          onChange={value => onChange("physicianContact", value)}
          placeholder="Name and phone number"
        />
      </div>
      <div
        className={[
          "rounded-xl border-2 px-4 py-3 transition-colors",
          draft.medical.medicalConsentConfirmed
            ? "border-emerald-200 bg-emerald-50"
            : errors.medicalConsentConfirmed
              ? "border-red-300 bg-red-50/40"
              : "border-slate-200 bg-slate-50"
        ].join(" ")}
      >
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            checked={draft.medical.medicalConsentConfirmed}
            className="mt-0.5 h-4 w-4 accent-brand-500"
            onChange={event => onChange("medicalConsentConfirmed", event.target.checked)}
            type="checkbox"
          />
          <span className="font-medium text-slate-700">
            I confirm the medical declarations above are accurate and consent has been obtained. *
          </span>
        </label>
        <FieldError error={errors.medicalConsentConfirmed} />
      </div>
    </div>
  );
}

function StepDocumentsUpload({
  draft,
  errors,
  selectedType,
  onTypeChange,
  onFilesSelected,
  onStatusChange
}: SharedStepProps & {
  selectedType: string;
  onTypeChange: (value: string) => void;
  onFilesSelected: (files: FileList | null) => void;
  onStatusChange: (documentId: string, status: RegistrationDraft["documents"][number]["status"]) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeading step={5} title="Documents Upload &amp; Verification" />
      <p className="text-sm text-slate-500">
        Required document types:{" "}
        <span className="font-medium text-slate-700">{REQUIRED_DOCUMENT_TYPES.join(", ")}</span>
      </p>

      {/* Upload controls */}
      <div className="grid gap-4 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4 md:grid-cols-[1fr_auto]">
        <SelectInput
          label="Document type"
          value={selectedType}
          onChange={onTypeChange}
          options={[...REQUIRED_DOCUMENT_TYPES, "Medical Form", "Transfer Certificate"].map(t => ({
            value: t,
            label: t
          }))}
          placeholder="Select type…"
        />
        <div className="flex flex-col gap-1">
          <label className={labelBase}>Upload files</label>
          <input
            className="block rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-200 cursor-pointer"
            multiple
            onChange={event => onFilesSelected(event.target.files)}
            type="file"
            aria-label="Upload document files"
          />
        </div>
      </div>
      <FieldError error={errors.documents} />

      {/* Documents table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-slate-600">Type</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600">File</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600">Size</th>
              <th className="px-4 py-2.5 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {draft.documents.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-center text-slate-400 italic" colSpan={4}>
                  No documents uploaded yet. Select a type and upload files above.
                </td>
              </tr>
            ) : (
              draft.documents.map(document => (
                <tr key={document.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{document.type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{document.fileName}</td>
                  <td className="px-4 py-2.5 text-slate-500">{Math.round(document.sizeBytes / 1024)} KB</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium focus:border-brand-500 focus:outline-none"
                      onChange={event =>
                        onStatusChange(
                          document.id,
                          event.target.value as RegistrationDraft["documents"][number]["status"]
                        )
                      }
                      value={document.status}
                    >
                      {DOCUMENT_STATUSES.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepReviewSubmit({
  draft,
  errors,
  onTermsChange,
  onNotesChange
}: SharedStepProps & {
  onTermsChange: (value: boolean) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeading step={6} title="Review, Consent &amp; Submission" />

      {/* Summary card */}
      <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Registration Summary</p>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: "Student", value: `${draft.student.firstName} ${draft.student.lastName}`.trim() || "—" },
            { label: "Guardian", value: draft.guardian.guardianFullName || "—" },
            { label: "Applied grade", value: draft.academic.appliedGrade || "—" },
            { label: "Academic year", value: draft.academic.academicYear || "—" },
            { label: "Documents uploaded", value: String(draft.documents.length) },
            { label: "Application status", value: draft.applicationStatus }
          ].map(item => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <TextAreaInput
        label="Admissions notes (internal)"
        value={draft.review.notes}
        onChange={onNotesChange}
        placeholder="Internal notes visible only to admissions staff…"
        rows={3}
      />

      <div
        className={[
          "rounded-xl border-2 px-4 py-3 transition-colors",
          draft.review.termsConfirmed
            ? "border-emerald-200 bg-emerald-50"
            : errors.termsConfirmed
              ? "border-red-300 bg-red-50/40"
              : "border-slate-200 bg-slate-50"
        ].join(" ")}
      >
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            checked={draft.review.termsConfirmed}
            className="mt-0.5 h-4 w-4 accent-brand-500"
            onChange={event => onTermsChange(event.target.checked)}
            type="checkbox"
          />
          <span className="font-medium text-slate-700">
            I confirm this registration data is complete, accurate, and that guardian consent has been obtained. *
          </span>
        </label>
        <FieldError error={errors.termsConfirmed} />
      </div>
    </div>
  );
}

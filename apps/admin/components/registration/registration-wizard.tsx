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
  const [selectedDocumentType, setSelectedDocumentType] = useState(REQUIRED_DOCUMENT_TYPES[0]);
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
      <header className="admin-content-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Admissions Intake</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">6-Step Registration Wizard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Draft ID: <span className="font-medium">{draft.id}</span> • Application:{" "}
          <span className="font-medium">{draft.applicationNo}</span> • Status:{" "}
          <span className="font-medium">{draft.applicationStatus}</span>
        </p>
      </header>

      <WizardProgress labels={[...STEP_LABELS]} currentStep={currentStep} />

      {notice && (
        <div
          className={[
            "rounded-lg border px-4 py-3 text-sm",
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
          ].join(" ")}
        >
          {notice.message}
        </div>
      )}

      <div className="admin-content-card space-y-4">
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

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={handleSaveDraft}
              type="button"
            >
              Save draft
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={handleClearDraft}
              type="button"
            >
              New draft
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={handleExportJson}
              type="button"
            >
              Export JSON
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={handlePrint}
              type="button"
            >
              Print
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              onClick={handleExportPdf}
              type="button"
            >
              Export PDF
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentStep === 1}
              onClick={handlePrevious}
              type="button"
            >
              Previous
            </button>
            {currentStep < REGISTRATION_STEPS.length ? (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={handleNext}
                type="button"
              >
                Next
              </button>
            ) : (
              <button
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
                onClick={handleSubmitApplication}
                type="button"
              >
                Submit application
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

  return <p className="text-xs text-red-600">{error}</p>;
}

function TextInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-700">{props.label}</span>
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
        onChange={event => props.onChange(event.target.value)}
        type={props.type ?? "text"}
        value={props.value}
      />
      <FieldError error={props.error} />
    </label>
  );
}

function StepStudentProfile({
  draft,
  errors,
  onChange
}: SharedStepProps & { onChange: (key: keyof RegistrationDraft["student"], value: string) => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold">Step 1: Student profile</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="First name *" value={draft.student.firstName} onChange={value => onChange("firstName", value)} error={errors.firstName} />
        <TextInput label="Last name *" value={draft.student.lastName} onChange={value => onChange("lastName", value)} error={errors.lastName} />
        <TextInput label="Preferred name" value={draft.student.preferredName} onChange={value => onChange("preferredName", value)} />
        <TextInput label="Date of birth *" type="date" value={draft.student.dateOfBirth} onChange={value => onChange("dateOfBirth", value)} error={errors.dateOfBirth} />
        <TextInput label="Nationality *" value={draft.student.nationality} onChange={value => onChange("nationality", value)} error={errors.nationality} />
        <TextInput label="Gender" value={draft.student.gender} onChange={value => onChange("gender", value)} />
      </div>
    </>
  );
}

function StepGuardianContacts({
  draft,
  errors,
  onChange
}: SharedStepProps & { onChange: (key: keyof RegistrationDraft["guardian"], value: string) => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold">Step 2: Guardian and emergency contacts</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="Guardian full name *" value={draft.guardian.guardianFullName} onChange={value => onChange("guardianFullName", value)} error={errors.guardianFullName} />
        <TextInput label="Relationship *" value={draft.guardian.guardianRelationship} onChange={value => onChange("guardianRelationship", value)} error={errors.guardianRelationship} />
        <TextInput label="Guardian email" type="email" value={draft.guardian.guardianEmail} onChange={value => onChange("guardianEmail", value)} />
        <TextInput label="Guardian phone *" value={draft.guardian.guardianPhone} onChange={value => onChange("guardianPhone", value)} error={errors.guardianPhone} />
        <TextInput label="Emergency contact name *" value={draft.guardian.emergencyContactName} onChange={value => onChange("emergencyContactName", value)} error={errors.emergencyContactName} />
        <TextInput label="Emergency contact phone *" value={draft.guardian.emergencyContactPhone} onChange={value => onChange("emergencyContactPhone", value)} error={errors.emergencyContactPhone} />
        <TextInput label="Address line" value={draft.guardian.addressLine1} onChange={value => onChange("addressLine1", value)} />
        <TextInput label="City" value={draft.guardian.city} onChange={value => onChange("city", value)} />
        <TextInput label="Country" value={draft.guardian.country} onChange={value => onChange("country", value)} />
      </div>
    </>
  );
}

function StepAcademicPlacement({
  draft,
  errors,
  onChange
}: SharedStepProps & { onChange: (key: keyof RegistrationDraft["academic"], value: string) => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold">Step 3: Academic placement</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="Current school *" value={draft.academic.currentSchool} onChange={value => onChange("currentSchool", value)} error={errors.currentSchool} />
        <TextInput label="Current grade *" value={draft.academic.currentGrade} onChange={value => onChange("currentGrade", value)} error={errors.currentGrade} />
        <TextInput label="Applied grade *" value={draft.academic.appliedGrade} onChange={value => onChange("appliedGrade", value)} error={errors.appliedGrade} />
        <TextInput label="Academic year *" value={draft.academic.academicYear} onChange={value => onChange("academicYear", value)} error={errors.academicYear} />
      </div>
      <label className="mt-3 block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Placement notes</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
          onChange={event => onChange("notes", event.target.value)}
          value={draft.academic.notes}
        />
      </label>
    </>
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
    <>
      <h2 className="text-lg font-semibold">Step 4: Medical and support needs</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <TextInput label="Known allergies" value={draft.medical.allergies} onChange={value => onChange("allergies", value)} />
        <TextInput label="Current medications" value={draft.medical.medications} onChange={value => onChange("medications", value)} />
        <TextInput label="Support needs" value={draft.medical.supportNeeds} onChange={value => onChange("supportNeeds", value)} />
        <TextInput label="Physician contact" value={draft.medical.physicianContact} onChange={value => onChange("physicianContact", value)} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          checked={draft.medical.medicalConsentConfirmed}
          onChange={event => onChange("medicalConsentConfirmed", event.target.checked)}
          type="checkbox"
        />
        <span>I confirm medical declarations are accurate. *</span>
      </label>
      <FieldError error={errors.medicalConsentConfirmed} />
    </>
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
    <>
      <h2 className="text-lg font-semibold">Step 5: Documents upload and verification</h2>
      <p className="text-sm text-slate-600">
        Required types: {REQUIRED_DOCUMENT_TYPES.join(", ")}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Document type</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
            onChange={event => onTypeChange(event.target.value)}
            value={selectedType}
          >
            {[...REQUIRED_DOCUMENT_TYPES, "Medical Form", "Transfer Certificate"].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Upload files</span>
          <input
            className="block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            multiple
            onChange={event => onFilesSelected(event.target.files)}
            type="file"
          />
        </label>
      </div>
      <FieldError error={errors.documents} />

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {draft.documents.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={4}>
                  No documents uploaded yet.
                </td>
              </tr>
            ) : (
              draft.documents.map(document => (
                <tr key={document.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{document.type}</td>
                  <td className="px-3 py-2">{document.fileName}</td>
                  <td className="px-3 py-2">{Math.round(document.sizeBytes / 1024)} KB</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border border-slate-200 px-2 py-1"
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
    </>
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
    <>
      <h2 className="text-lg font-semibold">Step 6: Review and submission</h2>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2">
        <p>
          <span className="font-medium">Student:</span> {draft.student.firstName} {draft.student.lastName}
        </p>
        <p>
          <span className="font-medium">Guardian:</span> {draft.guardian.guardianFullName}
        </p>
        <p>
          <span className="font-medium">Applied grade:</span> {draft.academic.appliedGrade}
        </p>
        <p>
          <span className="font-medium">Documents:</span> {draft.documents.length}
        </p>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-slate-700">Admissions notes</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none"
          onChange={event => onNotesChange(event.target.value)}
          value={draft.review.notes}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={draft.review.termsConfirmed}
          onChange={event => onTermsChange(event.target.checked)}
          type="checkbox"
        />
        <span>I confirm this registration data is complete and consent is collected. *</span>
      </label>
      <FieldError error={errors.termsConfirmed} />
    </>
  );
}

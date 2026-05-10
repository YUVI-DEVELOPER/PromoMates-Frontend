import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { downloadAsset } from "../../api/assets";
import {
  approveMedicalContent,
  createMedicalReferenceValidation,
  createMedicalReviewComment,
  downloadContentRequestReferenceMaterial,
  getMedicalReviewContext,
  reopenMedicalReviewComment,
  requestMedicalRevision,
  resolveMedicalReviewComment,
  startMedicalReview,
  updateMedicalReferenceValidation,
  uploadMedicalReviewReferenceMaterials,
} from "../../api/materialRequests";
import { ReferenceMaterialViewer } from "../../components/requests/ReferenceMaterialViewer";
import { ContentViewer } from "../../components/viewer/ContentViewer";
import { ErrorState } from "../../components/ui/ErrorState";
import { LifecycleTracker } from "../../components/ui/LifecycleTracker";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { WorkflowStep } from "../../components/ui/WorkflowStepper";
import { useWorkspaceTabs } from "../../context/WorkspaceTabsContext";
import type { ViewerAsset } from "../../types/asset";
import type { ContentVersion } from "../../types/contentVersion";
import type {
  ContentRequestReferenceMaterial,
  MedicalCommentCategory,
  MedicalCommentSeverity,
  MedicalRevisionReason,
  MedicalReferenceValidation,
  MedicalReferenceValidationStatus,
  MedicalReviewComment,
  MedicalReviewCommentCreatePayload,
  MedicalReviewContext,
  MedicalReviewDraftFile,
  MedicalReviewDraftVersionContext,
} from "../../types/materialRequest";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/fileSize";
import { PERMISSIONS } from "../../utils/permissions";


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const smallButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const medicalCommentCategoryOptions: Array<{ value: MedicalCommentCategory; label: string }> = [
  { value: "MEDICAL_ACCURACY", label: "Medical Accuracy" },
  { value: "CLAIM_SUPPORT", label: "Claim Support" },
  { value: "REFERENCE_REQUIRED", label: "Reference Required" },
  { value: "SAFETY_BALANCE", label: "Safety Balance" },
  { value: "OFF_LABEL_RISK", label: "Off-label Risk" },
  { value: "WORDING_CLARITY", label: "Wording Clarity" },
  { value: "LOCAL_MEDICAL_REQUIREMENT", label: "Local Medical Requirement" },
  { value: "OTHER", label: "Other" },
];

const medicalCommentSeverityOptions: Array<{ value: MedicalCommentSeverity; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const medicalReferenceValidationStatusOptions: Array<{ value: MedicalReferenceValidationStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "VALIDATED", label: "Validated" },
  { value: "NEEDS_REPLACEMENT", label: "Needs Replacement" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
];

const medicalRevisionReasonOptions: Array<{ value: MedicalRevisionReason; label: string }> = [
  { value: "MEDICAL_ACCURACY_ISSUE", label: "Medical Accuracy Issue" },
  { value: "CLAIM_SUPPORT_REQUIRED", label: "Claim Support Required" },
  { value: "REFERENCE_REPLACEMENT_REQUIRED", label: "Reference Replacement Required" },
  { value: "SAFETY_BALANCE_REQUIRED", label: "Safety Balance Required" },
  { value: "WORDING_REVISION_REQUIRED", label: "Wording Revision Required" },
  { value: "OTHER", label: "Other" },
];

const allowedMedicalReferenceMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
]);

const maxMedicalReferenceFileSizeBytes = 50 * 1024 * 1024;


function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}


function referenceName(reference: { name: string } | null | undefined, fallback = "Not set"): string {
  return reference?.name ?? fallback;
}


function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T | null | undefined): string {
  return options.find((option) => option.value === value)?.label ?? value?.split("_").join(" ") ?? "Not set";
}


function badgeToneClass(value: string): string {
  if (value === "CRITICAL" || value === "NEEDS_REPLACEMENT") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (value === "HIGH") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (value === "VALIDATED" || value === "RESOLVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}


function inlineBadge(value: string, label?: string): ReactNode {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeToneClass(value)}`}>
      {label ?? value.split("_").join(" ")}
    </span>
  );
}


function versionTitle(version: MedicalReviewDraftVersionContext | null): string {
  if (!version) {
    return "No submitted draft version";
  }
  const label = version.version_label || `Draft V${version.version_number}`;
  return `Version ${version.version_number}: ${label}`;
}


function asViewerAsset(asset: MedicalReviewDraftFile | null | undefined): ViewerAsset | null {
  if (!asset) {
    return null;
  }
  return {
    id: asset.id,
    original_filename: asset.original_filename,
    mime_type: asset.mime_type,
    file_size: asset.file_size,
    download_url: asset.download_url ?? null,
    version_number: asset.version_number ?? undefined,
  };
}


function medicalLifecycleSteps(status: string): WorkflowStep[] {
  const medicalActive =
    status === "SUBMITTED_FOR_MEDICAL_REVIEW" ||
    status === "RESUBMITTED_FOR_MEDICAL_REVIEW" ||
    status === "MEDICAL_REVIEW_IN_PROGRESS";
  const medicalCompleted =
    status === "MEDICAL_CONTENT_APPROVED" ||
    status === "MEDICAL_REVISION_REQUIRED" ||
    status === "MEDICAL_REVISION_IN_PROGRESS";
  const revisionRequired = status === "MEDICAL_REVISION_REQUIRED";
  const revisionInProgress = status === "MEDICAL_REVISION_IN_PROGRESS";
  return [
    { label: "Content Request Intake", status: "completed" },
    { label: "Regional Marketing Evaluation", status: "completed" },
    {
      label: "Therapy Lead Draft Creation",
      status: revisionRequired || revisionInProgress ? "current" : "completed",
      helperText: revisionRequired ? "Medical revision required" : revisionInProgress ? "Revision in progress" : undefined,
    },
    {
      label: "Medical Content Review",
      status: medicalCompleted ? "completed" : medicalActive ? "current" : "pending",
      helperText: medicalCompleted
        ? "Decision recorded"
        : status === "MEDICAL_REVIEW_IN_PROGRESS"
          ? "In progress"
          : status === "RESUBMITTED_FOR_MEDICAL_REVIEW"
            ? "Resubmitted"
          : "Ready to start",
    },
    { label: "Design", status: "pending", helperText: status === "MEDICAL_CONTENT_APPROVED" ? "Create Design Brief" : "Coming later" },
    { label: "Formal MLR", status: "pending", helperText: "Coming later" },
  ];
}


export function MedicalReviewDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, isSuperuser, hasPermission } = useAuth();
  const { updateActiveTab } = useWorkspaceTabs();
  const [context, setContext] = useState<MedicalReviewContext | null>(null);
  const [selectedReferenceMaterial, setSelectedReferenceMaterial] = useState<ContentRequestReferenceMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);
  const [isReferenceFormOpen, setIsReferenceFormOpen] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null);
  const [isSavingValidation, setIsSavingValidation] = useState(false);
  const [updatingValidationKey, setUpdatingValidationKey] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [pendingReferenceFiles, setPendingReferenceFiles] = useState<File[]>([]);
  const [decisionModal, setDecisionModal] = useState<"approve" | "revision" | null>(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [approveForm, setApproveForm] = useState({
    decision_notes: "",
    confirmed: false,
  });
  const [revisionForm, setRevisionForm] = useState({
    revision_reason: "MEDICAL_ACCURACY_ISSUE" as MedicalRevisionReason,
    revision_notes: "",
    revision_due_date: "",
  });
  const [commentForm, setCommentForm] = useState({
    comment_category: "MEDICAL_ACCURACY" as MedicalCommentCategory,
    severity: "MEDIUM" as MedicalCommentSeverity,
    element_reference: "",
    comment_text: "",
    is_mandatory_change: true,
    linked_reference_ids: [] as number[],
  });
  const [validationForm, setValidationForm] = useState({
    reference_material_id: "",
    claim_text: "",
    reference_note: "",
    validation_status: "PENDING" as MedicalReferenceValidationStatus,
    validation_notes: "",
  });

  const loadContext = useCallback(async (background = false) => {
    if (!requestId) {
      setErrorMessage("Content request not found.");
      setIsLoading(false);
      return;
    }

    if (!background) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const nextContext = await getMedicalReviewContext(requestId);
      setContext(nextContext);
    } catch (error) {
      setContext(null);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void loadContext(false);
  }, [loadContext]);

  useEffect(() => {
    if (context) {
      updateActiveTab({
        label: context.request.request_number ?? "Medical Review",
        helperText: context.request.title ?? "Medical Content Review",
      });
    }
  }, [context, updateActiveTab]);

  const workflowSteps = useMemo(
    () => medicalLifecycleSteps(context?.current_status ?? "SUBMITTED_FOR_MEDICAL_REVIEW"),
    [context],
  );

  const latestValidationByReferenceId = useMemo(() => {
    const validations = new Map<number, MedicalReferenceValidation>();
    for (const validation of context?.medical_reference_validations ?? []) {
      if (validation.reference_material_id && !validations.has(validation.reference_material_id)) {
        validations.set(validation.reference_material_id, validation);
      }
    }
    return validations;
  }, [context?.medical_reference_validations]);

  const canAddMedicalComments = Boolean(
    context?.can_add_medical_comments &&
    context.current_status === "MEDICAL_REVIEW_IN_PROGRESS" &&
    hasPermission(PERMISSIONS.REVIEW_MEDICAL_CONTENT),
  );
  const canAttachMedicalReferences = Boolean(
    context?.can_attach_medical_references &&
    context.current_status === "MEDICAL_REVIEW_IN_PROGRESS" &&
    hasPermission(PERMISSIONS.ATTACH_MEDICAL_REFERENCES),
  );
  const decisionReadiness = context?.medical_decision_readiness;
  const isAssignedMedicalReviewer = Boolean(
    isSuperuser ||
    (context?.task?.assigned_user_id && user?.id && context.task.assigned_user_id === user.id),
  );
  const canShowApproveAction = Boolean(
    context &&
    isAssignedMedicalReviewer &&
    hasPermission(PERMISSIONS.APPROVE_MEDICAL_CONTENT),
  );
  const canShowRevisionAction = Boolean(
    context &&
    isAssignedMedicalReviewer &&
    hasPermission(PERMISSIONS.REQUEST_MEDICAL_REVISION),
  );
  const isMedicalDecisionOpen = Boolean(
    context?.current_status === "MEDICAL_REVIEW_IN_PROGRESS" &&
    context.task?.status === "IN_PROGRESS",
  );
  const approveDisabled = Boolean(
    !isMedicalDecisionOpen ||
    (decisionReadiness?.open_mandatory_comment_count ?? 0) > 0 ||
    (decisionReadiness?.unresolved_reference_issue_count ?? 0) > 0,
  );
  const requestRevisionDisabled = !isMedicalDecisionOpen;

  async function handleStartMedicalReview() {
    if (!context) {
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await startMedicalReview(context.request.id);
      setSuccessMessage("Medical Review started.");
      await loadContext(true);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  function openApproveModal() {
    setDecisionError(null);
    setApproveForm({ decision_notes: "", confirmed: false });
    setDecisionModal("approve");
  }

  function openRevisionModal() {
    setDecisionError(null);
    setRevisionForm({
      revision_reason: "MEDICAL_ACCURACY_ISSUE",
      revision_notes: "",
      revision_due_date: "",
    });
    setDecisionModal("revision");
  }

  async function handleApproveMedicalContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) {
      return;
    }
    if (!approveForm.decision_notes.trim()) {
      setDecisionError("Medical decision notes are required.");
      return;
    }
    if (!approveForm.confirmed) {
      setDecisionError("Confirm the Medical Review decision before approval.");
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await approveMedicalContent(context.request.id, {
        decision_notes: approveForm.decision_notes.trim(),
        confirmed_no_open_mandatory_issues: true,
      });
      setDecisionModal(null);
      setSuccessMessage("Medical Content Approved.");
      await loadContext(true);
    } catch (error) {
      setDecisionError(getApiErrorMessage(error));
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  async function handleRequestMedicalRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) {
      return;
    }
    if (!revisionForm.revision_reason) {
      setDecisionError("Revision reason is required.");
      return;
    }
    if (!revisionForm.revision_notes.trim()) {
      setDecisionError("Revision notes are required.");
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await requestMedicalRevision(context.request.id, {
        revision_reason: revisionForm.revision_reason,
        revision_notes: revisionForm.revision_notes.trim(),
        revision_due_date: revisionForm.revision_due_date || null,
        include_open_comments: true,
      });
      setDecisionModal(null);
      setSuccessMessage("Medical Revision Required.");
      await loadContext(true);
    } catch (error) {
      setDecisionError(getApiErrorMessage(error));
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  async function handleDownloadDraftFile(asset: ViewerAsset) {
    setErrorMessage(null);
    try {
      await downloadAsset(asset.id, asset.original_filename);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  function resetCommentForm() {
    setCommentForm({
      comment_category: "MEDICAL_ACCURACY",
      severity: "MEDIUM",
      element_reference: "",
      comment_text: "",
      is_mandatory_change: true,
      linked_reference_ids: [],
    });
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) {
      return;
    }
    if (!context.submitted_version?.id) {
      setCommentError("Submitted draft version is not available.");
      return;
    }

    setIsSavingComment(true);
    setCommentError(null);
    setSuccessMessage(null);

    const payload: MedicalReviewCommentCreatePayload = {
      content_workspace_id: context.content_workspace?.id ?? null,
      content_version_id: context.submitted_version.id,
      workflow_task_id: context.task?.id ?? null,
      comment_category: commentForm.comment_category,
      severity: commentForm.severity,
      element_reference: commentForm.element_reference.trim() || null,
      comment_text: commentForm.comment_text,
      is_mandatory_change: commentForm.is_mandatory_change,
      linked_reference_ids: commentForm.linked_reference_ids,
    };

    try {
      await createMedicalReviewComment(context.request.id, payload);
      resetCommentForm();
      setIsCommentFormOpen(false);
      setSuccessMessage("Medical comment added.");
      await loadContext(true);
    } catch (error) {
      setCommentError(getApiErrorMessage(error));
    } finally {
      setIsSavingComment(false);
    }
  }

  async function handleResolveComment(comment: MedicalReviewComment) {
    if (!context) {
      return;
    }
    setUpdatingCommentId(comment.id);
    setCommentError(null);
    try {
      await resolveMedicalReviewComment(context.request.id, comment.id);
      await loadContext(true);
    } catch (error) {
      setCommentError(getApiErrorMessage(error));
    } finally {
      setUpdatingCommentId(null);
    }
  }

  async function handleReopenComment(comment: MedicalReviewComment) {
    if (!context) {
      return;
    }
    setUpdatingCommentId(comment.id);
    setCommentError(null);
    try {
      await reopenMedicalReviewComment(context.request.id, comment.id);
      await loadContext(true);
    } catch (error) {
      setCommentError(getApiErrorMessage(error));
    } finally {
      setUpdatingCommentId(null);
    }
  }

  function handleReferenceFileSelect(files: FileList | null) {
    setReferenceError(null);
    const nextFiles = Array.from(files ?? []);
    const invalidType = nextFiles.find((file) => !allowedMedicalReferenceMimeTypes.has(file.type));
    if (invalidType) {
      setReferenceError("Upload PDF, DOCX, PPTX, JPG, or PNG medical references.");
      return;
    }
    const oversizedFile = nextFiles.find((file) => file.size > maxMedicalReferenceFileSizeBytes);
    if (oversizedFile) {
      setReferenceError("Medical references must be 50 MB or smaller.");
      return;
    }
    setPendingReferenceFiles(nextFiles);
  }

  async function handleUploadMedicalReferences() {
    if (!context || pendingReferenceFiles.length === 0) {
      return;
    }

    setIsUploadingReference(true);
    setReferenceError(null);
    setSuccessMessage(null);
    try {
      await uploadMedicalReviewReferenceMaterials(context.request.id, pendingReferenceFiles);
      setPendingReferenceFiles([]);
      setSuccessMessage("Medical reference uploaded.");
      await loadContext(true);
    } catch (error) {
      setReferenceError(getApiErrorMessage(error));
    } finally {
      setIsUploadingReference(false);
    }
  }

  async function handleCreateReferenceValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) {
      return;
    }
    if (!context.submitted_version?.id) {
      setReferenceError("Submitted draft version is not available.");
      return;
    }

    setIsSavingValidation(true);
    setReferenceError(null);
    setSuccessMessage(null);

    try {
      await createMedicalReferenceValidation(context.request.id, {
        content_version_id: context.submitted_version.id,
        workflow_task_id: context.task?.id ?? null,
        reference_material_id: validationForm.reference_material_id ? Number(validationForm.reference_material_id) : null,
        claim_text: validationForm.claim_text.trim() || null,
        reference_note: validationForm.reference_note.trim() || null,
        validation_status: validationForm.validation_status,
        validation_notes: validationForm.validation_notes.trim() || null,
      });
      setValidationForm({
        reference_material_id: "",
        claim_text: "",
        reference_note: "",
        validation_status: "PENDING",
        validation_notes: "",
      });
      setIsReferenceFormOpen(false);
      setSuccessMessage("Reference validation saved.");
      await loadContext(true);
    } catch (error) {
      setReferenceError(getApiErrorMessage(error));
    } finally {
      setIsSavingValidation(false);
    }
  }

  async function handleSetReferenceStatus(
    material: ContentRequestReferenceMaterial,
    validationStatus: MedicalReferenceValidationStatus,
  ) {
    if (!context) {
      return;
    }
    const existingValidation = latestValidationByReferenceId.get(material.id);
    setUpdatingValidationKey(`${material.id}:${validationStatus}`);
    setReferenceError(null);

    try {
      if (existingValidation) {
        await updateMedicalReferenceValidation(context.request.id, existingValidation.id, {
          validation_status: validationStatus,
          validation_notes: existingValidation.validation_notes,
        });
      } else {
        await createMedicalReferenceValidation(context.request.id, {
          content_version_id: context.submitted_version?.id ?? null,
          workflow_task_id: context.task?.id ?? null,
          reference_material_id: material.id,
          validation_status: validationStatus,
        });
      }
      await loadContext(true);
    } catch (error) {
      setReferenceError(getApiErrorMessage(error));
    } finally {
      setUpdatingValidationKey(null);
    }
  }

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <LoadingState label="Loading Medical Review context..." rows={5} />
      </PageContainer>
    );
  }

  if (!context) {
    return (
      <PageContainer width="wide">
        <ErrorState message={errorMessage || "Medical Review context is not available."} />
        <div>
          <Link to="/requests?view=medical-review-tasks" className={secondaryButtonClass}>
            Back to Medical Review Tasks
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { request, task, submitted_version: submittedVersion } = context;
  const draftAsset = asViewerAsset(submittedVersion?.asset);
  const showStartButton =
    context.can_start_medical_review &&
    task?.status === "OPEN" &&
    ["SUBMITTED_FOR_MEDICAL_REVIEW", "RESUBMITTED_FOR_MEDICAL_REVIEW"].includes(request.status);
  const showContinueButton = task?.status === "IN_PROGRESS" || request.status === "MEDICAL_REVIEW_IN_PROGRESS";

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow={request.request_number ?? "Medical Review"}
        title="Medical Content Review"
        subtitle={request.title ?? "Untitled content request"}
        status={request.status}
        metadata={[
          { label: "Product", value: referenceName(request.product) },
          { label: "Country", value: referenceName(request.country) },
          { label: "Therapy", value: referenceName(request.therapeutic_area) },
          { label: "Due Date", value: formatDateTime(task?.due_at) },
        ]}
        primaryAction={
          showStartButton ? (
            <button
              type="button"
              className={primaryButtonClass}
              onClick={handleStartMedicalReview}
              disabled={isStarting}
            >
              {isStarting ? "Starting..." : request.status === "RESUBMITTED_FOR_MEDICAL_REVIEW" ? "Start Resubmitted Review" : "Start Medical Review"}
            </button>
          ) : showContinueButton ? (
            <button type="button" className={primaryButtonClass} disabled>
              Continue Review
            </button>
          ) : undefined
        }
        secondaryAction={
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Link to="/requests?view=medical-review-tasks" className={secondaryButtonClass}>
              Back to Tasks
            </Link>
            <button type="button" className={secondaryButtonClass} onClick={() => navigate(`/requests/${request.id}`)}>
              Open Request
            </button>
          </div>
        }
      />

      {(errorMessage || successMessage) && (
        <div
          className={[
            "rounded-lg border px-4 py-3 text-sm shadow-sm",
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <LifecycleTracker steps={workflowSteps} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <SummaryCard title="Request Summary">
            <div className="grid gap-5 xl:grid-cols-2">
              <DetailBlock title="Brief / Description" value={request.description || "No description provided."} />
              <DetailBlock title="Business Objective" value={request.business_objective || "Not set"} />
              <DetailBlock title="Key Messages" value={request.key_messages || "Not set"} />
              <DetailBlock title="Reference Notes" value={request.reference_notes || "Not set"} />
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailRow label="Product" value={referenceName(request.product)} />
              <DetailRow label="Region" value={referenceName(request.region)} />
              <DetailRow label="Country" value={referenceName(request.country)} />
              <DetailRow label="Sub-Therapy" value={referenceName(request.sub_therapy_area)} />
              <DetailRow label="Priority" value={request.priority ?? "Not set"} />
              <DetailRow label="In-Market Date" value={formatDate(request.required_by_date)} />
              <DetailRow label="Requested By" value={request.requested_by?.full_name ?? `User ${request.requested_by_id}`} />
              <DetailRow label="Status" value={<StatusBadge status={request.status} />} />
            </dl>
          </SummaryCard>

          <SummaryCard title="Regional Evaluation">
            <div className="grid gap-5 xl:grid-cols-2">
              <DetailBlock title="Evaluation Notes" value={context.regional_evaluation.notes || "Not set"} />
              <DetailBlock title="Decision Notes" value={context.regional_evaluation.decision_reason || "Not set"} />
              <DetailBlock
                title="Evaluated By"
                value={context.regional_evaluation.evaluated_by?.full_name ?? "Not set"}
              />
              <DetailBlock
                title="Evaluated At"
                value={formatDateTime(context.regional_evaluation.evaluated_at)}
              />
            </div>
          </SummaryCard>

          <SummaryCard title="Therapy Alignment">
            <div className="grid gap-5 xl:grid-cols-2">
              <DetailBlock title="Summary" value={context.therapy_alignment.summary || "No summary recorded."} />
              <DetailBlock
                title="Completed By"
                value={context.therapy_alignment.completed_by?.full_name ?? "Not set"}
              />
              <DetailBlock title="Completed At" value={formatDateTime(context.therapy_alignment.completed_at)} />
              <DetailRow label="Status" value={<StatusBadge status={context.therapy_alignment.status} />} />
            </div>
            <div className="mt-5 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
              {context.therapy_alignment.comments.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-600">No shared Therapy Alignment comments recorded.</p>
              ) : (
                context.therapy_alignment.comments.map((comment) => (
                  <div key={comment.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-semibold text-slate-950">{comment.topic_code.split("_").join(" ")}</p>
                      <StatusBadge status={comment.status} />
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">{comment.comment_text}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {comment.created_by?.full_name ?? "Unknown"} / {formatDateTime(comment.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SummaryCard>

          <SummaryCard title="Submitted Draft Version">
            {submittedVersion ? (
              <div className="space-y-4">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-emerald-950">{versionTitle(submittedVersion)}</p>
                      <p className="mt-1">Submitted by Therapy Lead for Medical Content Review.</p>
                    </div>
                    <StatusBadge status={submittedVersion.status} />
                  </div>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailRow label="Authoring Mode" value={submittedVersion.authoring_mode.split("_").join(" ")} />
                    <DetailRow label="Created By" value={submittedVersion.created_by?.full_name ?? `User ${submittedVersion.created_by_id}`} />
                    <DetailRow label="Created At" value={formatDateTime(submittedVersion.created_at)} />
                    <DetailRow label="Change Summary" value={submittedVersion.change_summary || "Not provided"} />
                  </dl>
                </div>

                <DetailBlock title="Draft Notes" value={submittedVersion.draft_notes || "Not provided"} />
              </div>
            ) : (
              <p className="text-sm text-slate-600">No submitted draft version metadata is available.</p>
            )}
          </SummaryCard>

          <SummaryCard title="Editor Preview / Draft File">
            <DraftPreview
              version={submittedVersion}
              draftAsset={draftAsset}
              onDownloadDraftFile={handleDownloadDraftFile}
            />
          </SummaryCard>

          <MedicalCommentsSection
            comments={context.medical_comments}
            referenceMaterials={context.reference_materials}
            canAdd={canAddMedicalComments}
            currentUserId={user?.id ?? null}
            isSuperuser={isSuperuser}
            isFormOpen={isCommentFormOpen}
            form={commentForm}
            errorMessage={commentError}
            isSaving={isSavingComment}
            updatingCommentId={updatingCommentId}
            onToggleForm={() => {
              setCommentError(null);
              setIsCommentFormOpen((currentValue) => !currentValue);
            }}
            onChangeForm={setCommentForm}
            onSubmit={handleCreateComment}
            onResolve={handleResolveComment}
            onReopen={handleReopenComment}
          />

          <ReferenceValidationSection
            requestId={request.id}
            materials={context.reference_materials}
            validations={context.medical_reference_validations}
            latestValidationByReferenceId={latestValidationByReferenceId}
            canAct={canAttachMedicalReferences}
            isFormOpen={isReferenceFormOpen}
            form={validationForm}
            pendingFiles={pendingReferenceFiles}
            errorMessage={referenceError}
            isSaving={isSavingValidation}
            isUploading={isUploadingReference}
            updatingValidationKey={updatingValidationKey}
            onToggleForm={() => {
              setReferenceError(null);
              setIsReferenceFormOpen((currentValue) => !currentValue);
            }}
            onChangeForm={setValidationForm}
            onSelectFiles={handleReferenceFileSelect}
            onUploadReferences={() => void handleUploadMedicalReferences()}
            onView={setSelectedReferenceMaterial}
            onDownload={(material) => void downloadContentRequestReferenceMaterial(request.id, material)}
            onSetReferenceStatus={handleSetReferenceStatus}
            onSubmitValidation={handleCreateReferenceValidation}
          />
        </div>

        <div className="space-y-6">
          <SummaryCard title="Medical Review Task Details">
            <dl className="grid gap-4">
              <DetailRow label="Task ID" value={task?.id ?? "Not set"} />
              <DetailRow label="Task Type" value={task?.task_type ?? "MEDICAL_CONTENT_REVIEW"} />
              <DetailRow label="Task Status" value={task ? <StatusBadge status={task.status} /> : "No task"} />
              <DetailRow label="Request Status" value={<StatusBadge status={request.status} />} />
              <DetailRow label="Assigned Reviewer" value={task?.assigned_user_id ? `User ${task.assigned_user_id}` : "Queue assignment"} />
              <DetailRow label="Assigned Group" value={task?.assigned_group_id ? `Group ${task.assigned_group_id}` : "Not set"} />
              <DetailRow label="Started At" value={formatDateTime(task?.started_at)} />
              <DetailRow label="Due At" value={formatDateTime(task?.due_at)} />
            </dl>
          </SummaryCard>

          <SummaryCard title="Medical Review Readiness">
            <dl className="grid gap-4">
              <DetailRow label="Mandatory Comments" value={context.medical_review_readiness.mandatory_comment_count} />
              <DetailRow label="Open Mandatory" value={context.medical_review_readiness.open_mandatory_comment_count} />
              <DetailRow label="Optional Comments" value={context.medical_review_readiness.optional_comment_count} />
              <DetailRow label="Reference Validations" value={context.medical_review_readiness.reference_validation_count} />
              <DetailRow label="Reference Issues" value={context.medical_review_readiness.unresolved_reference_issue_count} />
            </dl>
          </SummaryCard>

          <MedicalDecisionPanel
            context={context}
            canShowApprove={canShowApproveAction}
            canShowRevision={canShowRevisionAction}
            approveDisabled={approveDisabled}
            requestRevisionDisabled={requestRevisionDisabled}
            onApprove={openApproveModal}
            onRequestRevision={openRevisionModal}
          />
        </div>
      </div>

      <ReferenceMaterialViewer
        requestId={request.id}
        material={selectedReferenceMaterial}
        onClose={() => setSelectedReferenceMaterial(null)}
      />

      {decisionModal === "approve" && (
        <ApproveMedicalContentModal
          context={context}
          form={approveForm}
          errorMessage={decisionError}
          isSubmitting={isSubmittingDecision}
          onChange={setApproveForm}
          onClose={() => setDecisionModal(null)}
          onSubmit={handleApproveMedicalContent}
        />
      )}

      {decisionModal === "revision" && (
        <RequestMedicalRevisionModal
          context={context}
          form={revisionForm}
          errorMessage={decisionError}
          isSubmitting={isSubmittingDecision}
          onChange={setRevisionForm}
          onClose={() => setDecisionModal(null)}
          onSubmit={handleRequestMedicalRevision}
        />
      )}
    </PageContainer>
  );
}


type DraftPreviewProps = {
  version: MedicalReviewDraftVersionContext | null;
  draftAsset: ViewerAsset | null;
  onDownloadDraftFile: (asset: ViewerAsset) => void;
};


function DraftPreview({ version, draftAsset, onDownloadDraftFile }: DraftPreviewProps) {
  if (!version) {
    return <p className="text-sm text-slate-600">No submitted draft content is available.</p>;
  }

  const canRenderEditorContent =
    (version.authoring_mode === "INTERNAL_EDITOR" || version.authoring_mode === "HYBRID") &&
    Boolean(version.content_html?.trim());

  return (
    <div className="space-y-4">
      {canRenderEditorContent ? (
        <div className="rounded-md border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Read-only Editor Content</p>
          </div>
          <div
            className="prose prose-sm max-w-none px-4 py-4 text-slate-800"
            dangerouslySetInnerHTML={{ __html: version.content_html ?? "" }}
          />
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No internal editor content is available for this draft version.
        </div>
      )}

      {draftAsset ? (
        <ContentViewer
          asset={draftAsset}
          contentVersion={version as unknown as ContentVersion}
          annotations={[]}
          canAnnotate={false}
          onDownload={onDownloadDraftFile}
          title="Draft File"
          subtitle="Read-only submitted draft file."
        />
      ) : (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No draft file is attached to this version.
        </div>
      )}
    </div>
  );
}


type ApproveDecisionFormState = {
  decision_notes: string;
  confirmed: boolean;
};


type RevisionDecisionFormState = {
  revision_reason: MedicalRevisionReason;
  revision_notes: string;
  revision_due_date: string;
};


function decisionNextActionLabel(nextAction: string | null | undefined): string {
  if (nextAction === "CREATE_DESIGN_BRIEF") {
    return "Create Design Brief";
  }
  if (nextAction === "REVISE_DRAFT_BASED_ON_MEDICAL_FEEDBACK") {
    return "Revise Draft Based on Medical Feedback";
  }
  if (nextAction === "COMPLETE_MEDICAL_REVIEW") {
    return "Complete Medical Review";
  }
  if (nextAction === "START_MEDICAL_REVIEW") {
    return "Start Medical Review";
  }
  return "Not set";
}


type MedicalDecisionPanelProps = {
  context: MedicalReviewContext;
  canShowApprove: boolean;
  canShowRevision: boolean;
  approveDisabled: boolean;
  requestRevisionDisabled: boolean;
  onApprove: () => void;
  onRequestRevision: () => void;
};


function MedicalDecisionPanel({
  context,
  canShowApprove,
  canShowRevision,
  approveDisabled,
  requestRevisionDisabled,
  onApprove,
  onRequestRevision,
}: MedicalDecisionPanelProps) {
  const readiness = context.medical_decision_readiness;
  const request = context.request;

  return (
    <SummaryCard title="Medical Decision">
      <div className="space-y-4">
        <dl className="grid gap-4">
          <DetailRow label="Open Mandatory Comments" value={readiness.open_mandatory_comment_count} />
          <DetailRow label="Open Optional Comments" value={readiness.open_optional_comment_count} />
          <DetailRow label="Reference Issues" value={readiness.unresolved_reference_issue_count} />
          <DetailRow label="Task Status" value={readiness.active_medical_task_status ? <StatusBadge status={readiness.active_medical_task_status} /> : "No task"} />
          <DetailRow label="Next Action" value={decisionNextActionLabel(context.next_action)} />
        </dl>

        {readiness.blocking_reasons.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ul className="list-disc space-y-1 pl-5">
              {readiness.blocking_reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {readiness.decision_completed && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="font-semibold text-emerald-950">
                {request.status === "MEDICAL_CONTENT_APPROVED" ? "Medical Content Approved" : "Medical Revision Required"}
              </p>
              <StatusBadge status={request.status} />
            </div>
            <dl className="mt-3 grid gap-3">
              {request.status === "MEDICAL_CONTENT_APPROVED" ? (
                <>
                  <DetailRow label="Approved By" value={request.medical_approved_by?.full_name ?? (request.medical_approved_by_id ? `User ${request.medical_approved_by_id}` : "Not set")} />
                  <DetailRow label="Approved At" value={formatDateTime(request.medical_approved_at)} />
                  <DetailRow label="Decision Notes" value={request.medical_decision_notes || "Not provided"} />
                </>
              ) : (
                <>
                  <DetailRow label="Requested By" value={request.medical_revision_requested_by?.full_name ?? (request.medical_revision_requested_by_id ? `User ${request.medical_revision_requested_by_id}` : "Not set")} />
                  <DetailRow label="Requested At" value={formatDateTime(request.medical_revision_requested_at)} />
                  <DetailRow label="Reason" value={optionLabel(medicalRevisionReasonOptions, request.medical_revision_reason as MedicalRevisionReason | null)} />
                  <DetailRow label="Notes" value={request.medical_revision_notes || "Not provided"} />
                </>
              )}
            </dl>
          </div>
        )}

        {!readiness.decision_completed && (canShowApprove || canShowRevision) && (
          <div className="flex flex-col gap-2">
            {canShowApprove && (
              <button type="button" className={primaryButtonClass} onClick={onApprove} disabled={approveDisabled}>
                Approve Medical Content
              </button>
            )}
            {canShowRevision && (
              <button type="button" className={secondaryButtonClass} onClick={onRequestRevision} disabled={requestRevisionDisabled}>
                Request Medical Revision
              </button>
            )}
          </div>
        )}

        {request.status === "MEDICAL_REVISION_REQUIRED" && context.therapy_revision_task_summary && (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Therapy Lead Revision Task</p>
            <dl className="mt-3 grid gap-3">
              <DetailRow label="Task ID" value={context.therapy_revision_task_summary.id} />
              <DetailRow label="Status" value={<StatusBadge status={context.therapy_revision_task_summary.status} />} />
              <DetailRow label="Due At" value={formatDateTime(context.therapy_revision_task_summary.due_at)} />
            </dl>
          </div>
        )}
      </div>
    </SummaryCard>
  );
}


type DecisionModalShellProps = {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
};


function DecisionModalShell({ title, children, footer, onClose }: DecisionModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button type="button" className={smallButtonClass} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          {footer}
        </div>
      </section>
    </div>
  );
}


type ApproveMedicalContentModalProps = {
  context: MedicalReviewContext;
  form: ApproveDecisionFormState;
  errorMessage: string | null;
  isSubmitting: boolean;
  onChange: Dispatch<SetStateAction<ApproveDecisionFormState>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};


function ApproveMedicalContentModal({
  context,
  form,
  errorMessage,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: ApproveMedicalContentModalProps) {
  const readiness = context.medical_decision_readiness;

  return (
    <form onSubmit={onSubmit}>
      <DecisionModalShell
        title="Approve Medical Content"
        onClose={onClose}
        footer={
          <>
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={isSubmitting || !form.confirmed || !form.decision_notes.trim()}
            >
              {isSubmitting ? "Approving..." : "Approve Medical Content"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {errorMessage && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Current Draft Version" value={versionTitle(context.submitted_version)} />
            <DetailRow label="Mandatory Comments" value={readiness.open_mandatory_comment_count} />
            <DetailRow label="Reference Issues" value={readiness.unresolved_reference_issue_count} />
            <DetailRow label="Task Status" value={context.task ? <StatusBadge status={context.task.status} /> : "No task"} />
          </dl>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Medical decision notes</span>
            <textarea
              value={form.decision_notes}
              onChange={(event) => onChange((current) => ({ ...current, decision_notes: event.target.value }))}
              rows={5}
              required
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            />
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(event) => onChange((current) => ({ ...current, confirmed: event.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            I confirm that medical content, claims, and references have been reviewed for this stage.
          </label>
        </div>
      </DecisionModalShell>
    </form>
  );
}


type RequestMedicalRevisionModalProps = {
  context: MedicalReviewContext;
  form: RevisionDecisionFormState;
  errorMessage: string | null;
  isSubmitting: boolean;
  onChange: Dispatch<SetStateAction<RevisionDecisionFormState>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};


function RequestMedicalRevisionModal({
  context,
  form,
  errorMessage,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: RequestMedicalRevisionModalProps) {
  const readiness = context.medical_decision_readiness;

  return (
    <form onSubmit={onSubmit}>
      <DecisionModalShell
        title="Request Medical Revision"
        onClose={onClose}
        footer={
          <>
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={primaryButtonClass} disabled={isSubmitting || !form.revision_notes.trim()}>
              {isSubmitting ? "Requesting..." : "Request Medical Revision"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {errorMessage && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Open Mandatory Comments" value={readiness.open_mandatory_comment_count} />
            <DetailRow label="Reference Issues" value={readiness.unresolved_reference_issue_count} />
            <DetailRow label="Current Draft Version" value={versionTitle(context.submitted_version)} />
            <DetailRow label="Assigned Therapy Lead" value={context.request.assigned_therapy_lead?.full_name ?? (context.request.assigned_therapy_lead_id ? `User ${context.request.assigned_therapy_lead_id}` : "Not set")} />
          </dl>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Revision Reason</span>
            <select
              value={form.revision_reason}
              onChange={(event) => onChange((current) => ({
                ...current,
                revision_reason: event.target.value as MedicalRevisionReason,
              }))}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {medicalRevisionReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Revision Notes</span>
            <textarea
              value={form.revision_notes}
              onChange={(event) => onChange((current) => ({ ...current, revision_notes: event.target.value }))}
              rows={5}
              required
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-slate-700">Optional Due Date</span>
            <input
              type="date"
              value={form.revision_due_date}
              onChange={(event) => onChange((current) => ({ ...current, revision_due_date: event.target.value }))}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            />
          </label>
        </div>
      </DecisionModalShell>
    </form>
  );
}


type MedicalCommentFormState = {
  comment_category: MedicalCommentCategory;
  severity: MedicalCommentSeverity;
  element_reference: string;
  comment_text: string;
  is_mandatory_change: boolean;
  linked_reference_ids: number[];
};


type MedicalCommentsSectionProps = {
  comments: MedicalReviewComment[];
  referenceMaterials: ContentRequestReferenceMaterial[];
  canAdd: boolean;
  currentUserId: number | null;
  isSuperuser: boolean;
  isFormOpen: boolean;
  form: MedicalCommentFormState;
  errorMessage: string | null;
  isSaving: boolean;
  updatingCommentId: string | null;
  onToggleForm: () => void;
  onChangeForm: Dispatch<SetStateAction<MedicalCommentFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResolve: (comment: MedicalReviewComment) => void;
  onReopen: (comment: MedicalReviewComment) => void;
};


function MedicalCommentsSection({
  comments,
  referenceMaterials,
  canAdd,
  currentUserId,
  isSuperuser,
  isFormOpen,
  form,
  errorMessage,
  isSaving,
  updatingCommentId,
  onToggleForm,
  onChangeForm,
  onSubmit,
  onResolve,
  onReopen,
}: MedicalCommentsSectionProps) {
  const referenceLabelById = useMemo(
    () => new Map(referenceMaterials.map((material) => [material.id, material.original_filename])),
    [referenceMaterials],
  );

  return (
    <SummaryCard title="Medical Comments">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Structured medical feedback captured before Step 4C decision actions.
          </p>
          {canAdd && (
            <button type="button" className={primaryButtonClass} onClick={onToggleForm}>
              {isFormOpen ? "Close Comment Form" : "Add Medical Comment"}
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {isFormOpen && canAdd && (
          <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Category</span>
                <select
                  value={form.comment_category}
                  onChange={(event) => onChangeForm((current) => ({
                    ...current,
                    comment_category: event.target.value as MedicalCommentCategory,
                  }))}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {medicalCommentCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Severity</span>
                <select
                  value={form.severity}
                  onChange={(event) => onChangeForm((current) => ({
                    ...current,
                    severity: event.target.value as MedicalCommentSeverity,
                  }))}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {medicalCommentSeverityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Element Reference</span>
                <input
                  value={form.element_reference}
                  onChange={(event) => onChangeForm((current) => ({ ...current, element_reference: event.target.value }))}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  placeholder="Section 2 / Claim paragraph"
                />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Comment</span>
                <textarea
                  value={form.comment_text}
                  onChange={(event) => onChangeForm((current) => ({ ...current, comment_text: event.target.value }))}
                  className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Linked References</span>
                <select
                  multiple
                  value={form.linked_reference_ids.map(String)}
                  onChange={(event) => onChangeForm((current) => ({
                    ...current,
                    linked_reference_ids: Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                  }))}
                  className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {referenceMaterials.map((material) => (
                    <option key={material.id} value={material.id}>{material.original_filename}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_mandatory_change}
                  onChange={(event) => onChangeForm((current) => ({
                    ...current,
                    is_mandatory_change: event.target.checked,
                  }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Mandatory Change
              </label>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={onToggleForm} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Comment"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              No Medical Review comments recorded.
            </p>
          ) : (
            comments.map((comment) => {
              const canUpdateComment = canAdd && (isSuperuser || comment.reviewer_id === currentUserId);
              const linkedReferences = comment.linked_reference_ids
                .map((referenceId) => referenceLabelById.get(referenceId) ?? `Reference ${referenceId}`)
                .join(", ");

              return (
                <article key={comment.id} className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {inlineBadge(comment.comment_category, optionLabel(medicalCommentCategoryOptions, comment.comment_category))}
                        {inlineBadge(comment.severity, optionLabel(medicalCommentSeverityOptions, comment.severity))}
                        {inlineBadge(comment.is_mandatory_change ? "MANDATORY" : "OPTIONAL", comment.is_mandatory_change ? "Mandatory" : "Optional")}
                      </div>
                      <p className="text-sm font-semibold text-slate-950">
                        {comment.element_reference || "General medical review comment"}
                      </p>
                    </div>
                    <StatusBadge status={comment.status} />
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.comment_text}</p>
                  <dl className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                    <DetailRow label="Reviewer" value={comment.reviewer_name ?? `User ${comment.reviewer_id}`} />
                    <DetailRow label="Created At" value={formatDateTime(comment.created_at)} />
                    <DetailRow label="Linked References" value={linkedReferences || "None"} />
                    <DetailRow label="Resolved At" value={formatDateTime(comment.resolved_at)} />
                  </dl>
                  {canUpdateComment && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      {comment.status === "RESOLVED" || comment.status === "DISMISSED" ? (
                        <button
                          type="button"
                          className={smallButtonClass}
                          onClick={() => onReopen(comment)}
                          disabled={updatingCommentId === comment.id}
                        >
                          {updatingCommentId === comment.id ? "Reopening..." : "Reopen"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={smallButtonClass}
                          onClick={() => onResolve(comment)}
                          disabled={updatingCommentId === comment.id}
                        >
                          {updatingCommentId === comment.id ? "Resolving..." : "Resolve"}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </SummaryCard>
  );
}


type ReferenceValidationFormState = {
  reference_material_id: string;
  claim_text: string;
  reference_note: string;
  validation_status: MedicalReferenceValidationStatus;
  validation_notes: string;
};


type ReferenceValidationSectionProps = {
  requestId: string;
  materials: ContentRequestReferenceMaterial[];
  validations: MedicalReferenceValidation[];
  latestValidationByReferenceId: Map<number, MedicalReferenceValidation>;
  canAct: boolean;
  isFormOpen: boolean;
  form: ReferenceValidationFormState;
  pendingFiles: File[];
  errorMessage: string | null;
  isSaving: boolean;
  isUploading: boolean;
  updatingValidationKey: string | null;
  onToggleForm: () => void;
  onChangeForm: Dispatch<SetStateAction<ReferenceValidationFormState>>;
  onSelectFiles: (files: FileList | null) => void;
  onUploadReferences: () => void;
  onView: (material: ContentRequestReferenceMaterial) => void;
  onDownload: (material: ContentRequestReferenceMaterial) => void;
  onSetReferenceStatus: (material: ContentRequestReferenceMaterial, status: MedicalReferenceValidationStatus) => void;
  onSubmitValidation: (event: FormEvent<HTMLFormElement>) => void;
};


function ReferenceValidationSection({
  requestId,
  materials,
  validations,
  latestValidationByReferenceId,
  canAct,
  isFormOpen,
  form,
  pendingFiles,
  errorMessage,
  isSaving,
  isUploading,
  updatingValidationKey,
  onToggleForm,
  onChangeForm,
  onSelectFiles,
  onUploadReferences,
  onView,
  onDownload,
  onSetReferenceStatus,
  onSubmitValidation,
}: ReferenceValidationSectionProps) {
  const unlinkedValidations = validations.filter((validation) => validation.reference_material_id === null);

  return (
    <SummaryCard title="Reference Validation">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Existing Country SPOC references and Medical Reviewer validation notes.
          </p>
          {canAct && (
            <button type="button" className={primaryButtonClass} onClick={onToggleForm}>
              {isFormOpen ? "Close Reference Form" : "Add Medical Reference"}
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {isFormOpen && canAct && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Upload Medical Reference</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
                  onChange={(event) => onSelectFiles(event.target.files)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={onUploadReferences}
                disabled={isUploading || pendingFiles.length === 0}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {pendingFiles.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {pendingFiles.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(", ")}
              </p>
            )}

            <form onSubmit={onSubmitValidation} className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Existing Reference</span>
                <select
                  value={form.reference_material_id}
                  onChange={(event) => onChangeForm((current) => ({
                    ...current,
                    reference_material_id: event.target.value,
                  }))}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">No linked reference</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>{material.original_filename}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Validation Status</span>
                <select
                  value={form.validation_status}
                  onChange={(event) => onChangeForm((current) => ({
                    ...current,
                    validation_status: event.target.value as MedicalReferenceValidationStatus,
                  }))}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {medicalReferenceValidationStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Claim Text</span>
                <textarea
                  value={form.claim_text}
                  onChange={(event) => onChangeForm((current) => ({ ...current, claim_text: event.target.value }))}
                  className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Reference Note</span>
                <textarea
                  value={form.reference_note}
                  onChange={(event) => onChangeForm((current) => ({ ...current, reference_note: event.target.value }))}
                  className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Validation Notes</span>
                <textarea
                  value={form.validation_notes}
                  onChange={(event) => onChangeForm((current) => ({ ...current, validation_notes: event.target.value }))}
                  className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <button type="button" className={secondaryButtonClass} onClick={onToggleForm} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className={primaryButtonClass} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Validation"}
                </button>
              </div>
            </form>
          </div>
        )}

        <ReferenceMaterials
          requestId={requestId}
          materials={materials}
          latestValidationByReferenceId={latestValidationByReferenceId}
          canAct={canAct}
          updatingValidationKey={updatingValidationKey}
          onView={onView}
          onDownload={onDownload}
          onSetReferenceStatus={onSetReferenceStatus}
        />

        {unlinkedValidations.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">
              Claim-level Validations
            </div>
            <div className="divide-y divide-slate-200">
              {unlinkedValidations.map((validation) => (
                <div key={validation.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {inlineBadge(validation.validation_status, optionLabel(medicalReferenceValidationStatusOptions, validation.validation_status))}
                    <span className="text-xs text-slate-500">{formatDateTime(validation.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{validation.claim_text || "No claim text recorded."}</p>
                  <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{validation.validation_notes || "No validation notes."}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SummaryCard>
  );
}


type ReferenceMaterialsProps = {
  requestId: string;
  materials: ContentRequestReferenceMaterial[];
  latestValidationByReferenceId: Map<number, MedicalReferenceValidation>;
  canAct: boolean;
  updatingValidationKey: string | null;
  onView: (material: ContentRequestReferenceMaterial) => void;
  onDownload: (material: ContentRequestReferenceMaterial) => void;
  onSetReferenceStatus: (material: ContentRequestReferenceMaterial, status: MedicalReferenceValidationStatus) => void;
};


function ReferenceMaterials({
  materials,
  latestValidationByReferenceId,
  canAct,
  updatingValidationKey,
  onView,
  onDownload,
  onSetReferenceStatus,
}: ReferenceMaterialsProps) {
  if (materials.length === 0) {
    return <p className="text-sm text-slate-600">No reference materials were attached to this request.</p>;
  }

  return (
    <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {materials.map((material) => {
        const validation = latestValidationByReferenceId.get(material.id);
        const status = validation?.validation_status ?? "PENDING";
        return (
          <div key={material.id} className="px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">{material.original_filename}</p>
                  {inlineBadge(status, optionLabel(medicalReferenceValidationStatusOptions, status))}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {material.mime_type} / {formatFileSize(material.file_size)} / {material.uploaded_by?.full_name ?? `User ${material.uploaded_by_id}`} / {formatDateTime(material.created_at)}
                </p>
                {validation?.validation_notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{validation.validation_notes}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={smallButtonClass} onClick={() => onView(material)}>
                  View
                </button>
                <button type="button" className={smallButtonClass} onClick={() => onDownload(material)}>
                  Download
                </button>
                {canAct && (
                  <>
                    <button
                      type="button"
                      className={smallButtonClass}
                      onClick={() => onSetReferenceStatus(material, "VALIDATED")}
                      disabled={updatingValidationKey === `${material.id}:VALIDATED`}
                    >
                      Validated
                    </button>
                    <button
                      type="button"
                      className={smallButtonClass}
                      onClick={() => onSetReferenceStatus(material, "NEEDS_REPLACEMENT")}
                      disabled={updatingValidationKey === `${material.id}:NEEDS_REPLACEMENT`}
                    >
                      Needs Replacement
                    </button>
                    <button
                      type="button"
                      className={smallButtonClass}
                      onClick={() => onSetReferenceStatus(material, "NOT_APPLICABLE")}
                      disabled={updatingValidationKey === `${material.id}:NOT_APPLICABLE`}
                    >
                      Not Applicable
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


type DetailBlockProps = {
  title: string;
  value: string;
};


function DetailBlock({ title, value }: DetailBlockProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}


type DetailRowProps = {
  label: string;
  value: ReactNode;
};


function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}

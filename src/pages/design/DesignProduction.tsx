import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { downloadAsset } from "../../api/assets";
import {
  approveDesignDraft,
  getDesignContext,
  requestDesignRevision,
  startDesignRevision,
  startDesignReview,
  startDesignWork,
  uploadDesignDraft,
  uploadRevisedDesignDraft,
} from "../../api/designJobs";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import {
  ReviewAnnotationWorkspace,
  type ReviewAnnotationSummary,
  type ReviewAnnotationWorkspaceMode,
} from "../../components/reviews/ReviewAnnotationWorkspace";
import { useAuth } from "../../context/AuthContext";
import type { DesignContext, DesignDraft } from "../../types/designJob";
import type { WorkflowTaskSummary } from "../../types/materialRequest";
import type { ReviewAnnotation } from "../../types/reviewAnnotation";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";

type RevisionResponseState = Record<string, { addressed: boolean; note: string }>;


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const modalBackdropClass =
  "fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6";

const modalPanelClass =
  "max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border border-slate-200 bg-white p-5 shadow-xl";


function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


function formatFileSize(value: number | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}


function referenceName(value: { name?: string | null; code?: string | null } | null | undefined): string {
  if (!value?.name) {
    return "Not set";
  }
  return value.code ? `${value.name} (${value.code})` : value.name;
}


function userDisplayName(
  value: { full_name?: string | null } | null | undefined,
  userId: number | null | undefined,
  fallbackLabel: string,
): string {
  if (value?.full_name) {
    return value.full_name;
  }
  return userId ? `${fallbackLabel} #${userId}` : "Not set";
}


function groupDisplayName(
  value: { name?: string | null; code?: string | null } | null | undefined,
  groupId: number | null | undefined,
  fallbackLabel: string,
): string {
  if (value?.name) {
    return value.code ? `${value.name} (${value.code})` : value.name;
  }
  return groupId ? `${fallbackLabel} #${groupId}` : "Not set";
}


function taskAssigneeName(
  task: WorkflowTaskSummary | null | undefined,
  fallbackGroup?: { name?: string | null; code?: string | null } | null,
): string {
  if (!task) {
    return "Not set";
  }
  if (task.assigned_user_name) {
    return task.assigned_user_name;
  }
  if (task.assigned_group_name) {
    return task.assigned_group_name;
  }
  if (task.assigned_user?.full_name) {
    return task.assigned_user.full_name;
  }
  if (task.assigned_group?.name) {
    return groupDisplayName(task.assigned_group, task.assigned_group_id, "Assigned group");
  }
  if (task.assigned_user_id) {
    return `Assigned user #${task.assigned_user_id}`;
  }
  if (fallbackGroup?.name) {
    return groupDisplayName(fallbackGroup, task.assigned_group_id, "Assigned group");
  }
  if (task.assigned_group_id) {
    return `Assigned group #${task.assigned_group_id}`;
  }
  return "Not set";
}


function currentIterationDisplay(context: DesignContext, latestDraft: DesignDraft | null): number {
  const contextIteration = context.current_iteration ?? context.iteration_count ?? 0;
  const draftIteration = latestDraft?.draft_number ?? 0;
  return Math.max(contextIteration, draftIteration, draftIteration > 0 ? 1 : 0);
}


function revisionReasonLabel(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


function annotationAnchorLabel(annotation: ReviewAnnotation): string {
  if (annotation.anchor_type === "DOCUMENT_PIN") {
    return annotation.page_number ? `Page ${annotation.page_number} pin` : "Document pin";
  }
  if (annotation.anchor_type === "DOCUMENT_BOX") {
    return annotation.page_number ? `Page ${annotation.page_number} box` : "Document box";
  }
  if (annotation.anchor_type === "TEXT_SELECTION") {
    return annotation.page_number ? `Page ${annotation.page_number} text` : "Text selection";
  }
  if (annotation.anchor_type === "VIDEO_TIMESTAMP") {
    return "Media timestamp";
  }
  return "General";
}


function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={modalBackdropClass} role="dialog" aria-modal="true" aria-label={title}>
      <div className={modalPanelClass}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button type="button" className={secondaryButtonClass} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}


function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value ?? "Not set"}</dd>
    </div>
  );
}


function DraftCard({ draft }: { draft: DesignDraft }) {
  const canOpen = Boolean(draft.file_asset_id);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{draft.draft_label}</h3>
          <p className="mt-1 text-xs text-slate-500">{draft.file_name ?? "Uploaded design file"}</p>
        </div>
        <StatusBadge status={draft.status} label={getStatusLabel(draft.status)} />
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <DetailRow label="Uploaded By" value={userDisplayName(draft.uploaded_by, draft.uploaded_by_id, "Uploaded user")} />
        <DetailRow label="Uploaded At" value={formatDateTime(draft.uploaded_at)} />
        <DetailRow label="File Size" value={formatFileSize(draft.file_size_bytes)} />
      </dl>
      {draft.upload_notes && (
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {draft.upload_notes}
        </p>
      )}
      {draft.change_summary && (
        <p className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {draft.change_summary}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!canOpen}
          onClick={() => draft.file_asset_id && void downloadAsset(draft.file_asset_id, draft.file_name ?? draft.draft_label)}
        >
          Download
        </button>
      </div>
    </div>
  );
}


function isTimeoutErrorMessage(message: string | null): boolean {
  return Boolean(message && /timeout|exceeded/i.test(message));
}


export function DesignProduction() {
  const { requestId } = useParams();
  const { hasPermission, user } = useAuth();
  const [context, setContext] = useState<DesignContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("Design Draft V1");
  const [uploadNotes, setUploadNotes] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [confirmContentUnchanged, setConfirmContentUnchanged] = useState(false);
  const [confirmDesignBriefFollowed, setConfirmDesignBriefFollowed] = useState(false);
  const [revisionDraftLabel, setRevisionDraftLabel] = useState("Design Draft V2");
  const [revisionDesignerNotes, setRevisionDesignerNotes] = useState("");
  const [revisionUploadSummary, setRevisionUploadSummary] = useState("");
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionResponses, setRevisionResponses] = useState<RevisionResponseState>({});
  const [revisionReason, setRevisionReason] = useState("LAYOUT_ISSUE");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [requestedChanges, setRequestedChanges] = useState<string[]>([]);
  const [revisionDueDate, setRevisionDueDate] = useState("");
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [designReviewMode, setDesignReviewMode] = useState<"decision" | "revision-markup">("decision");
  const [designReviewAnnotations, setDesignReviewAnnotations] = useState<ReviewAnnotation[]>([]);
  const [designReviewLocalSummary, setDesignReviewLocalSummary] = useState<ReviewAnnotationSummary | null>(null);

  const loadContext = useCallback(async (showLoading = false, signal?: AbortSignal) => {
    if (!requestId) {
      setErrorMessage("Content request not found.");
      setIsLoading(false);
      return;
    }
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const nextContext = await getDesignContext(requestId, signal);
      if (signal?.aborted) {
        return;
      }
      setContext(nextContext);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      setContext(null);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [requestId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadContext(true, controller.signal);
    return () => controller.abort();
  }, [loadContext, requestId]);

  useEffect(() => {
    if (context?.request.status !== "DESIGN_REVIEW_IN_PROGRESS") {
      setDesignReviewMode("decision");
      setIsRevisionModalOpen(false);
    }
  }, [context?.request.status]);

  useEffect(() => {
    const latestDraftNumber = context?.latest_design_draft?.draft_number ?? context?.current_iteration ?? 1;
    setRevisionDraftLabel(`Design Draft V${Math.max(latestDraftNumber + 1, 2)}`);
  }, [context?.current_iteration, context?.latest_design_draft?.draft_number]);

  useEffect(() => {
    const nextResponses: RevisionResponseState = {};
    for (const annotation of context?.revision_annotations ?? []) {
      nextResponses[annotation.id] = {
        addressed: false,
        note: "",
      };
    }
    setRevisionResponses(nextResponses);
  }, [context?.revision_annotations]);

  function handleRetry() {
    void loadContext(true);
  }

  async function handleStartDesignWork() {
    if (!requestId) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await startDesignWork(requestId);
      setSuccessMessage("Design work started.");
      await loadContext();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleStartRevision() {
    if (!requestId) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const nextContext = await startDesignRevision(requestId);
      setContext(nextContext);
      setSuccessMessage("Design revision started.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId || !file) {
      setErrorMessage("Select a design draft file before uploading.");
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await uploadDesignDraft(requestId, file, {
        design_brief_id: context?.design_brief?.id ?? null,
        draft_label: draftLabel,
        upload_notes: uploadNotes,
        change_summary: changeSummary,
      });
      setSuccessMessage("Design Draft V1 uploaded.");
      setFile(null);
      setUploadNotes("");
      setChangeSummary("");
      setDraftLabel("Design Draft V1");
      await loadContext();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleUploadRevisedDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId || !revisionFile) {
      setErrorMessage("Select the revised design draft file before uploading.");
      return;
    }
    if (!revisionUploadSummary.trim()) {
      setErrorMessage("Change summary is required for the revised design draft.");
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const revisionAnnotations = context?.revision_annotations ?? [];
      const addressedAnnotationIds = revisionAnnotations
        .filter((annotation) => revisionResponses[annotation.id]?.addressed)
        .map((annotation) => annotation.id);
      const unresolvedAnnotationIds = revisionAnnotations
        .filter((annotation) => !revisionResponses[annotation.id]?.addressed)
        .map((annotation) => annotation.id);
      const nextContext = await uploadRevisedDesignDraft(requestId, revisionFile, {
        design_brief_id: context?.design_brief?.id ?? null,
        draft_label: revisionDraftLabel,
        designer_notes: revisionDesignerNotes,
        change_summary: revisionUploadSummary,
        addressed_annotation_ids: addressedAnnotationIds,
        unresolved_annotation_ids: unresolvedAnnotationIds,
        annotation_responses: revisionAnnotations.map((annotation) => ({
          annotation_id: annotation.id,
          status: revisionResponses[annotation.id]?.addressed ? "ADDRESSED" : "NOT_ADDRESSED",
          note: revisionResponses[annotation.id]?.note?.trim() || null,
        })),
      });
      setContext(nextContext);
      setSuccessMessage("Revised design draft uploaded and sent to Therapy Lead for review.");
      setRevisionFile(null);
      setRevisionDesignerNotes("");
      setRevisionUploadSummary("");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleStartReview() {
    if (!requestId) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await startDesignReview(requestId);
      setSuccessMessage("Design review started.");
      await loadContext();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await approveDesignDraft(requestId, {
        decision_notes: approveNotes,
        confirm_content_unchanged: confirmContentUnchanged,
        confirm_design_brief_followed: confirmDesignBriefFollowed,
      });
      setSuccessMessage("Design draft approved.");
      setApproveNotes("");
      setConfirmContentUnchanged(false);
      setConfirmDesignBriefFollowed(false);
      setIsApproveModalOpen(false);
      await loadContext();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleRequestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const latestDraft = context?.latest_design_draft ?? context?.design_drafts[context.design_drafts.length - 1] ?? null;
      const annotationSummary =
        designReviewLocalSummary ??
        context?.annotation_summary ??
        context?.design_review_annotations_summary ??
        context?.design_review_annotations ?? {
          total: 0,
          open: 0,
          mandatory_open: 0,
          resolved: 0,
        };
      const openAnnotations = designReviewAnnotations.filter(
        (annotation) => annotation.status === "OPEN" || annotation.status === "REOPENED",
      );
      const trimmedRevisionNotes = revisionNotes.trim();
      const currentIteration = context ? currentIterationDisplay(context, latestDraft) : latestDraft?.draft_number ?? 0;
      const iterationLimit = context?.iteration_limit ?? context?.design_brief?.iteration_limit ?? 3;
      await requestDesignRevision(requestId, {
        revision_reason: revisionReason,
        revision_notes: trimmedRevisionNotes || null,
        requested_changes: requestedChanges,
        due_date: revisionDueDate || null,
        include_open_annotation_ids: openAnnotations.map((annotation) => annotation.id),
        annotation_summary: {
          open_comment_count: annotationSummary.open,
          mandatory_comment_count: annotationSummary.mandatory_open,
          design_draft_id: latestDraft?.id ?? null,
          current_iteration: currentIteration,
          iteration_limit: iterationLimit,
        },
      });
      setSuccessMessage("Design revision requested. Designer can view the comments and upload the next draft in Step 5D.");
      setRevisionReason("LAYOUT_ISSUE");
      setRevisionNotes("");
      setRequestedChanges([]);
      setRevisionDueDate("");
      setIsRevisionModalOpen(false);
      setDesignReviewMode("decision");
      await loadContext();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  function toggleRequestedChange(value: string) {
    setRequestedChanges((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function updateRevisionResponse(annotationId: string, patch: Partial<{ addressed: boolean; note: string }>) {
    setRevisionResponses((current) => ({
      ...current,
      [annotationId]: {
        addressed: patch.addressed ?? current[annotationId]?.addressed ?? false,
        note: patch.note ?? current[annotationId]?.note ?? "",
      },
    }));
  }

  const handleDesignAnnotationsChanged = useCallback((
    summary: ReviewAnnotationSummary,
    annotations: ReviewAnnotation[],
  ) => {
    setDesignReviewLocalSummary(summary);
    setDesignReviewAnnotations(annotations);
  }, []);

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <LoadingState label="Loading design production..." />
      </PageContainer>
    );
  }

  if (!context) {
    const didTimeout = isTimeoutErrorMessage(errorMessage);
    return (
      <PageContainer width="wide">
        <SummaryCard title="Design Production">
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p className="font-semibold">
              {didTimeout ? "Design context is taking too long to load." : "Unable to load design production."}
            </p>
            <p className="mt-1 text-xs text-rose-600">
              {errorMessage ?? "Design production context could not be loaded."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={handleRetry}
              >
                Retry
              </button>
              {requestId && (
                <Link to={`/requests/${requestId}`} className={secondaryButtonClass}>
                  Back to Request
                </Link>
              )}
              <Link to="/design/tasks" className={secondaryButtonClass}>
                Back to Design Tasks
              </Link>
            </div>
          </div>
        </SummaryCard>
      </PageContainer>
    );
  }

  const { request, design_brief: designBrief, design_task: designTask } = context;
  const uploadedDraft = context.latest_design_draft ?? context.design_drafts[context.design_drafts.length - 1] ?? null;
  const designReviewTask = context.design_review_task_summary ?? null;
  const activeRevisionTask = context.active_design_revision_task ?? null;
  const revisionSourceDraft = context.previous_design_draft ?? null;
  const revisionContextSummary =
    context.revision_summary ??
    context.latest_design_revision_summary ??
    null;
  const revisionContextAnnotations = context.revision_annotations ?? [];
  const isSuperuser = Boolean(user?.is_superuser);
  const isAssignedTherapyLead = Boolean(user?.id && request.assigned_therapy_lead_id === user.id);
  const isAssignedDesignReviewer = Boolean(user?.id && designReviewTask?.assigned_user_id === user.id);
  const isTherapyLeadReviewer = Boolean(isSuperuser || isAssignedTherapyLead || isAssignedDesignReviewer);
  const isAssignedDesigner = Boolean(
    user?.id &&
      (designBrief?.assigned_designer_id === user.id ||
        activeRevisionTask?.assigned_user_id === user.id ||
        designTask?.assigned_user_id === user.id ||
        uploadedDraft?.uploaded_by_id === user.id),
  );
  const isDesignerUser = Boolean(
    isAssignedDesigner || (!isTherapyLeadReviewer && hasPermission(PERMISSIONS.UPLOAD_DESIGN_DRAFT)),
  );
  const isDesignerRevisionState = Boolean(
    isDesignerUser &&
      !isTherapyLeadReviewer &&
      revisionSourceDraft &&
      ["DESIGN_REVISION_REQUIRED", "DESIGN_REVISION_IN_PROGRESS"].includes(request.status),
  );
  const workspaceDraft = isDesignerRevisionState ? revisionSourceDraft : uploadedDraft;
  const canStartDesignReview = Boolean(
    context.can_start_design_review ||
      (isTherapyLeadReviewer &&
        hasPermission(PERMISSIONS.REVIEW_DESIGN_DRAFT) &&
        designReviewTask?.status === "OPEN" &&
        request.status === "DESIGN_DRAFT_UPLOADED"),
  );
  const designReviewAnnotationSummary =
    designReviewLocalSummary ??
    context.annotation_summary ??
    context.design_review_annotations_summary ??
    context.design_review_annotations ?? {
      total: 0,
      open: 0,
      mandatory_open: 0,
      resolved: 0,
    };
  const hasBlockingMandatoryComments = designReviewAnnotationSummary.mandatory_open > 0;
  const currentIteration = currentIterationDisplay(context, uploadedDraft);
  const iterationLimit = context.iteration_limit ?? designBrief?.iteration_limit ?? 3;
  const openDesignReviewAnnotations = designReviewAnnotations.filter(
    (annotation) => annotation.status === "OPEN" || annotation.status === "REOPENED",
  );
  const nonMandatoryOpenDesignReviewAnnotations = openDesignReviewAnnotations.filter(
    (annotation) => !annotation.is_mandatory_change,
  );
  const canAnnotateDesignReview = Boolean(
    request.status === "DESIGN_REVIEW_IN_PROGRESS" &&
      isTherapyLeadReviewer &&
      hasPermission(PERMISSIONS.REVIEW_DESIGN_DRAFT),
  );
  const canManageDesignReviewComments = Boolean(canAnnotateDesignReview);
  const showDesignFeedbackWorkspace = Boolean(
    workspaceDraft &&
      [
        "DESIGN_DRAFT_UPLOADED",
        "DESIGN_REVIEW_IN_PROGRESS",
        "DESIGN_REVISION_REQUIRED",
        "DESIGN_REVISION_IN_PROGRESS",
      ].includes(request.status),
  );
  const isDesignerFeedbackView = isDesignerRevisionState;
  const isRevisionMarkupMode = request.status === "DESIGN_REVIEW_IN_PROGRESS" && designReviewMode === "revision-markup";
  const workspaceMode: ReviewAnnotationWorkspaceMode = isDesignerFeedbackView || !isTherapyLeadReviewer
    ? "readOnly"
    : isRevisionMarkupMode
    ? "inlineMarkup"
    : request.status === "DESIGN_REVIEW_IN_PROGRESS"
    ? "listOnly"
    : "readOnly";
  const reviewWorkspaceTitle = isDesignerFeedbackView
    ? "Design Revision Required"
    : isRevisionMarkupMode
    ? "Request Design Revision - Mark Issues"
    : "Therapy Lead Design Review";
  const reviewWorkspaceSubtitle = isDesignerFeedbackView
    ? "Therapy Lead marked the issues to fix on the uploaded design draft."
    : isRevisionMarkupMode
    ? "Mark the exact design issues the Designer should fix before the next iteration."
    : "Review the uploaded design draft and choose whether to approve it or send it back with revision comments.";
  const revisionDecisionSummary = context.design_decision_summary ?? null;
  const latestRevisionSummary = revisionContextSummary;
  const latestRevisionReason =
    latestRevisionSummary?.revision_reason ??
    (typeof revisionDecisionSummary?.revision_reason === "string" ? revisionDecisionSummary.revision_reason : null);
  const revisionDecisionNotes =
    latestRevisionSummary?.revision_notes ??
    (typeof revisionDecisionSummary?.revision_notes === "string" ? revisionDecisionSummary.revision_notes : null);
  const revisionRequestedChanges = Array.isArray(latestRevisionSummary?.requested_changes)
    ? latestRevisionSummary.requested_changes.filter((item): item is string => typeof item === "string")
    : Array.isArray(revisionDecisionSummary?.requested_changes)
    ? revisionDecisionSummary.requested_changes.filter((item): item is string => typeof item === "string")
    : [];
  const canOpenApproveDecision = Boolean(
    request.status === "DESIGN_REVIEW_IN_PROGRESS" &&
      Boolean(designReviewTask) &&
      isTherapyLeadReviewer &&
      hasPermission(PERMISSIONS.APPROVE_DESIGN_DRAFT) &&
      (isSuperuser || uploadedDraft?.uploaded_by_id !== user?.id),
  );
  const canOpenRevisionDecision = Boolean(
    request.status === "DESIGN_REVIEW_IN_PROGRESS" &&
      Boolean(designReviewTask) &&
      isTherapyLeadReviewer &&
      hasPermission(PERMISSIONS.REQUEST_DESIGN_REVISION) &&
      context.can_request_design_revision &&
      (isSuperuser || uploadedDraft?.uploaded_by_id !== user?.id),
  );
  const showDesignDecisionActions = Boolean(
    uploadedDraft &&
      !isDesignerFeedbackView &&
      (canStartDesignReview ||
        (request.status === "DESIGN_REVIEW_IN_PROGRESS" && (canOpenApproveDecision || canOpenRevisionDecision))),
  );
  const revisionOptions = [
    { value: "LAYOUT_ISSUE", label: "Layout issue" },
    { value: "BRAND_GUIDELINE_ISSUE", label: "Brand guideline issue" },
    { value: "CONTENT_PLACEMENT_ISSUE", label: "Content placement issue" },
    { value: "CLAIM_OR_REFERENCE_VISIBILITY", label: "Claim or reference visibility" },
    { value: "LOCAL_REQUIREMENT_MISSING", label: "Local requirement missing" },
    { value: "OUTPUT_SPECIFICATION_ISSUE", label: "Output specification issue" },
    { value: "OTHER", label: "Other" },
  ];
  const changeChecklist = [
    "Adjust layout",
    "Correct brand style",
    "Improve claim/reference visibility",
    "Update visual hierarchy",
    "Correct output format/specification",
    "Other",
  ];
  const reviewSummaryItems = isDesignerFeedbackView
    ? [
        { label: "Open comments", value: designReviewAnnotationSummary.open, tone: "success" as const },
        { label: "Mandatory comments", value: designReviewAnnotationSummary.mandatory_open, tone: "warning" as const },
        { label: "All comments", value: designReviewAnnotationSummary.total },
        { label: "Previous draft", value: revisionSourceDraft?.draft_label ?? "Not set" },
      ]
    : [
        { label: "Review task status", value: getStatusLabel(designReviewTask?.status) },
        { label: "Assigned to", value: taskAssigneeName(designReviewTask, context.assigned_group) },
        { label: "Current iteration", value: `${currentIteration || 0} of ${iterationLimit}` },
        { label: "Draft status", value: uploadedDraft ? getStatusLabel(uploadedDraft.status) : "Not set" },
        { label: "Open comments", value: designReviewAnnotationSummary.open, tone: "success" as const },
        { label: "Mandatory comments", value: designReviewAnnotationSummary.mandatory_open, tone: "warning" as const },
        { label: "Resolved comments", value: designReviewAnnotationSummary.resolved },
      ];
  const feedbackContent =
    isDesignerFeedbackView && (revisionDecisionNotes || revisionRequestedChanges.length > 0 || latestRevisionReason) ? (
      <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3">
        <div className="grid gap-3 md:grid-cols-5">
          <DetailRow label="Revision Reason" value={revisionReasonLabel(latestRevisionReason)} />
          <DetailRow label="Open Comments" value={designReviewAnnotationSummary.open} />
          <DetailRow label="Mandatory Comments" value={designReviewAnnotationSummary.mandatory_open} />
          <DetailRow label="Current Iteration" value={`${currentIteration || 0} of ${iterationLimit}`} />
          <DetailRow label="Previous Draft" value={revisionSourceDraft?.draft_label ?? "Not set"} />
        </div>
        {revisionDecisionNotes && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-orange-900">{revisionDecisionNotes}</p>
        )}
        {revisionRequestedChanges.length > 0 && (
          <p className="mt-2 text-xs font-medium text-orange-800">{revisionRequestedChanges.join(", ")}</p>
        )}
      </div>
    ) : null;
  const designReviewActionBar = showDesignDecisionActions ? (
    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {canStartDesignReview ? (
        <button
          type="button"
          className={primaryButtonClass}
          disabled={isActionLoading}
          onClick={() => void handleStartReview()}
        >
          Start Design Review
        </button>
      ) : request.status === "DESIGN_REVIEW_IN_PROGRESS" ? (
        isRevisionMarkupMode ? (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-900">Revision markup mode</p>
              <p className="mt-1 text-xs text-slate-500">
                Add mapped comments, then continue to the revision request summary.
              </p>
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={isActionLoading}
                onClick={() => {
                  setDesignReviewMode("decision");
                  setIsRevisionModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={isActionLoading || !canOpenRevisionDecision}
                onClick={() => setIsRevisionModalOpen(true)}
              >
                Continue Revision Request
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-slate-900">Design review decision</p>
              <p className="mt-1 text-xs text-slate-500">
                Choose approval or enter revision markup mode to mark issues on the draft.
              </p>
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <button
                type="button"
                className={primaryButtonClass}
                disabled={isActionLoading || !canOpenApproveDecision}
                onClick={() => setIsApproveModalOpen(true)}
              >
                Approve Design Draft
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={isActionLoading || !canOpenRevisionDecision}
                onClick={() => setDesignReviewMode("revision-markup")}
              >
                Request Design Revision
              </button>
            </div>
          </>
        )
      ) : null}
    </div>
  ) : null;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Design Production"
        title={request.request_number ?? request.title ?? "Content request"}
        subtitle={request.title ?? "Design brief, approved medical content, and draft upload."}
        status={request.status}
        statusLabel={getStatusLabel(request.status)}
        metadata={[
          { label: "Product", value: referenceName(request.product) },
          { label: "Country", value: referenceName(request.country) },
          { label: "Design Format", value: designBrief?.design_format ?? "Not set" },
          { label: "Due", value: formatDate(designBrief?.due_date ?? null) },
        ]}
      />

      {errorMessage && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <SummaryCard title="Request Summary">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailRow label="Request Code" value={request.request_number} />
          <DetailRow label="Product" value={referenceName(request.product)} />
          <DetailRow label="Country" value={referenceName(request.country)} />
          <DetailRow label="Therapy" value={referenceName(request.therapeutic_area)} />
        </dl>
      </SummaryCard>

      <SummaryCard title="Approved Medical Content Version">
        {context.approved_medical_content_version ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {context.approved_medical_content_version.version_label ??
                  `Version ${context.approved_medical_content_version.version_number}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {context.approved_medical_content_version.asset?.original_filename ?? "Approved content"}
              </p>
            </div>
            {context.approved_medical_content_version.asset_id && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() =>
                  context.approved_medical_content_version?.asset_id &&
                  void downloadAsset(
                    context.approved_medical_content_version.asset_id,
                    context.approved_medical_content_version.asset?.original_filename ?? "approved-content",
                  )
                }
              >
                Download
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Approved medical content version is missing.
          </div>
        )}
      </SummaryCard>

      <SummaryCard title="Design Brief">
        {designBrief ? (
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Title" value={designBrief.design_title} />
            <DetailRow label="Format" value={designBrief.design_format} />
            <DetailRow label="Status" value={getStatusLabel(designBrief.status)} />
            <DetailRow label="Assigned Designer" value={designBrief.assigned_designer?.full_name ?? referenceName(designBrief.assigned_design_group)} />
            <DetailRow label="Objective" value={designBrief.design_objective} />
            <DetailRow label="Visual Direction" value={designBrief.visual_direction} />
            <DetailRow label="Mandatory Content" value={designBrief.mandatory_content} />
            <DetailRow label="Output Specifications" value={designBrief.output_specifications} />
          </dl>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Submitted design brief is missing.
          </div>
        )}
      </SummaryCard>

      <SummaryCard title="Reference Materials">
        {context.reference_materials.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No reference materials are attached.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {context.reference_materials.map((material) => (
              <div key={material.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{material.original_filename}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatFileSize(material.file_size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SummaryCard>

      <SummaryCard
        title="Design Production Task"
        action={
          context.can_start_design_work ? (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={isActionLoading}
              onClick={() => void handleStartDesignWork()}
            >
              Start Design Work
            </button>
          ) : (
            <Link to="/design/tasks" className={secondaryButtonClass}>
              My Design Tasks
            </Link>
          )
        }
      >
        {designTask ? (
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Task Status" value={getStatusLabel(designTask.status)} />
            <DetailRow label="Due" value={formatDateTime(designTask.due_at)} />
            <DetailRow label="Started" value={formatDateTime(designTask.started_at)} />
            <DetailRow label="Assigned To" value={taskAssigneeName(designTask, context.assigned_group)} />
          </dl>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No active Design Production task found.
          </div>
        )}
      </SummaryCard>

      {isDesignerFeedbackView && activeRevisionTask && (
        <SummaryCard title="Design Revision Task">
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Status" value={getStatusLabel(activeRevisionTask.status)} />
            <DetailRow label="Assigned To" value={taskAssigneeName(activeRevisionTask, context.assigned_group)} />
            <DetailRow label="Current Iteration" value={`${Math.max((revisionSourceDraft?.draft_number ?? currentIteration) || 0, 1)} of ${iterationLimit}`} />
            <DetailRow label="Previous Draft" value={revisionSourceDraft?.draft_label ?? "Not set"} />
            <DetailRow label="Requested By" value={latestRevisionSummary?.requested_by_name ?? request.assigned_therapy_lead?.full_name ?? "Therapy Lead"} />
            <DetailRow label="Requested At" value={formatDateTime(latestRevisionSummary?.requested_at)} />
          </dl>
        </SummaryCard>
      )}

      {isDesignerFeedbackView && request.status === "DESIGN_REVISION_REQUIRED" && (
        <SummaryCard
          title="Design Revision Required"
          subtitle="Therapy Lead marked issues to fix on the uploaded design draft."
          action={
            context.can_start_revision ? (
              <button
                type="button"
                className={primaryButtonClass}
                disabled={isActionLoading}
                onClick={() => void handleStartRevision()}
              >
                Start Revision
              </button>
            ) : undefined
          }
        >
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Revision Reason" value={revisionReasonLabel(latestRevisionReason)} />
            <DetailRow label="Current Iteration" value={`${Math.max((revisionSourceDraft?.draft_number ?? currentIteration) || 0, 1)} of ${iterationLimit}`} />
            <DetailRow label="Previous Draft" value={revisionSourceDraft?.draft_label ?? "Not set"} />
            <DetailRow label="Open Comments" value={designReviewAnnotationSummary.open} />
          </dl>
          {revisionDecisionNotes && (
            <p className="mt-4 whitespace-pre-wrap rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
              {revisionDecisionNotes}
            </p>
          )}
          {revisionRequestedChanges.length > 0 && (
            <p className="mt-3 text-sm text-slate-700">
              Requested changes: {revisionRequestedChanges.join(", ")}
            </p>
          )}
        </SummaryCard>
      )}

      {isDesignerFeedbackView && request.status === "DESIGN_REVISION_IN_PROGRESS" && (
        <SummaryCard title="Upload Revised Design Draft" subtitle="Upload the revised draft and send it back to Therapy Lead for the next review.">
          <form className="space-y-4" onSubmit={handleUploadRevisedDraft}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft Label</span>
                <input
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={revisionDraftLabel}
                  onChange={(event) => setRevisionDraftLabel(event.target.value)}
                  disabled={isActionLoading}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revised File</span>
                <input
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.mp4,.webm,.mov,.ogv,.mp3,.m4a,.aac,.ogg,.wav,.zip"
                  onChange={(event) => setRevisionFile(event.target.files?.[0] ?? null)}
                  disabled={isActionLoading}
                  required
                />
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Change Summary</span>
              <textarea
                className="block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={revisionUploadSummary}
                onChange={(event) => setRevisionUploadSummary(event.target.value)}
                disabled={isActionLoading}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Designer Response Notes</span>
              <textarea
                className="block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={revisionDesignerNotes}
                onChange={(event) => setRevisionDesignerNotes(event.target.value)}
                disabled={isActionLoading}
              />
            </label>
            <div className="rounded-md border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-950">Comments Checklist</h3>
                <p className="mt-1 text-xs text-slate-500">Mark each Therapy Lead comment as addressed in the revised draft or leave a note.</p>
              </div>
              {revisionContextAnnotations.length === 0 ? (
                <div className="px-4 py-4 text-sm text-slate-600">No revision comments found for this draft.</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {revisionContextAnnotations.map((annotation) => {
                    const response = revisionResponses[annotation.id] ?? { addressed: false, note: "" };
                    return (
                      <div key={annotation.id} className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                          <span>{annotationAnchorLabel(annotation)}</span>
                          {annotation.severity && <span>{annotation.severity}</span>}
                          {annotation.is_mandatory_change && <span>Mandatory</span>}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">{annotation.comment_text}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {annotation.reviewer_name ?? `User ${annotation.reviewer_id}`} / {formatDateTime(annotation.created_at)}
                        </p>
                        <label className="mt-3 flex gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={response.addressed}
                            onChange={(event) => updateRevisionResponse(annotation.id, { addressed: event.target.checked })}
                            disabled={isActionLoading}
                          />
                          <span>Addressed in revised draft</span>
                        </label>
                        <label className="mt-3 block space-y-1 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comment Note</span>
                          <textarea
                            className="block min-h-[84px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={response.note}
                            onChange={(event) => updateRevisionResponse(annotation.id, { note: event.target.value })}
                            disabled={isActionLoading}
                            placeholder={response.addressed ? "Optional note about how this was addressed" : "Optional reason if this comment is not addressed"}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button type="submit" className={primaryButtonClass} disabled={isActionLoading || !revisionFile || !revisionUploadSummary.trim()}>
              Upload Revised Draft
            </button>
          </form>
        </SummaryCard>
      )}

      <SummaryCard title={uploadedDraft ? "Uploaded Design Draft" : "Upload Design Draft V1"}>
        {uploadedDraft ? (
          <div className="space-y-4">
            <DraftCard draft={uploadedDraft} />
            {isDesignerUser && request.status === "DESIGN_DRAFT_UPLOADED" && (uploadedDraft.draft_number ?? 1) > 1 && (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                {uploadedDraft.draft_label} uploaded. Waiting for Therapy Lead review.
              </div>
            )}
          </div>
        ) : context.can_upload_design_draft ? (
          <form className="space-y-4" onSubmit={handleUpload}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft Label</span>
                <input
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={draftLabel}
                  onChange={(event) => setDraftLabel(event.target.value)}
                  disabled={isActionLoading}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">File</span>
                <input
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.mp4,.webm,.mov,.ogv,.mp3,.m4a,.aac,.ogg,.wav,.zip"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  disabled={isActionLoading}
                  required
                />
              </label>
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Notes</span>
              <textarea
                className="block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={uploadNotes}
                onChange={(event) => setUploadNotes(event.target.value)}
                disabled={isActionLoading}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Change Summary</span>
              <textarea
                className="block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                disabled={isActionLoading}
              />
            </label>
            <button type="submit" className={primaryButtonClass} disabled={isActionLoading || !file}>
              Upload Design Draft
            </button>
          </form>
        ) : request.status === "DESIGN_BRIEF_SUBMITTED" ? (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Waiting for Designer to start design work.
          </div>
        ) : request.status === "DESIGN_IN_PROGRESS" ? (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Designer is preparing the design draft.
          </div>
        ) : (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Design Draft V1 uploaded. Waiting for Therapy Lead review.
          </div>
        )}
      </SummaryCard>

      {showDesignFeedbackWorkspace && workspaceDraft && (
        <ReviewAnnotationWorkspace
          requestId={request.id}
          reviewStage="THERAPY_DESIGN_REVIEW"
          designDraftId={workspaceDraft.id}
          contentVersionId={designBrief?.current_design_content_version_id ?? null}
          contentWorkspaceId={workspaceDraft.content_workspace_id}
          workflowTaskId={isDesignerFeedbackView ? activeRevisionTask?.id ?? null : designReviewTask?.id ?? null}
          taskType={isDesignerFeedbackView ? activeRevisionTask?.task_type ?? "DESIGN_REVISION" : designReviewTask?.task_type ?? "THERAPY_DESIGN_REVIEW"}
          fileAssetId={workspaceDraft.file_asset_id}
          fileName={workspaceDraft.file_name ?? workspaceDraft.draft_label}
          fileMimeType={workspaceDraft.file_mime_type}
          fileSizeBytes={workspaceDraft.file_size_bytes}
          canAnnotate={canAnnotateDesignReview}
          canResolve={canManageDesignReviewComments}
          canReopen={canManageDesignReviewComments}
          readOnly={workspaceMode === "readOnly"}
          mode={workspaceMode}
          currentUserId={user?.id ?? null}
          currentUserName={user?.full_name ?? null}
          initialAnnotations={isDesignerFeedbackView ? revisionContextAnnotations : undefined}
          skipInitialFetch={isDesignerFeedbackView}
          title={reviewWorkspaceTitle}
          subtitle={reviewWorkspaceSubtitle}
          summaryItems={reviewSummaryItems}
          feedbackContent={feedbackContent}
          commentsTitle={isRevisionMarkupMode ? "Revision Comments" : "Design Review Comments"}
          commentsSubtitle={
            isDesignerFeedbackView
              ? "Read-only visual comments from the Therapy Lead."
              : isRevisionMarkupMode
              ? "Comments included in this revision request."
              : "Existing design review comments for this draft."
          }
          emptyStateTitle={isRevisionMarkupMode ? "No revision comments yet" : "No design review comments yet"}
          emptyStateDescription={
            isRevisionMarkupMode
              ? "Use pin, box, or general comments so the Designer can see exactly what needs to change."
              : "Comments for this draft will appear here."
          }
          actionBar={designReviewActionBar}
          onAnnotationsChanged={handleDesignAnnotationsChanged}
        />
      )}

      {uploadedDraft && revisionSourceDraft && revisionSourceDraft.id !== uploadedDraft.id && revisionContextAnnotations.length > 0 && (
        <SummaryCard title="Previous Revision History" subtitle={`Comments requested on ${revisionSourceDraft.draft_label}.`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Requested By" value={latestRevisionSummary?.requested_by_name ?? request.assigned_therapy_lead?.full_name ?? "Therapy Lead"} />
            <DetailRow label="Requested At" value={formatDateTime(latestRevisionSummary?.requested_at)} />
            <DetailRow label="Open Comments" value={latestRevisionSummary?.open_comment_count ?? revisionContextAnnotations.length} />
            <DetailRow label="Mandatory Comments" value={latestRevisionSummary?.mandatory_comment_count ?? revisionContextAnnotations.filter((annotation) => annotation.is_mandatory_change).length} />
          </div>
          <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
            {revisionContextAnnotations.map((annotation) => (
              <div key={annotation.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                  <span>{annotationAnchorLabel(annotation)}</span>
                  {annotation.severity && <span>{annotation.severity}</span>}
                  {annotation.is_mandatory_change && <span>Mandatory</span>}
                  <StatusBadge status={annotation.status} label={getStatusLabel(annotation.status)} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">{annotation.comment_text}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {annotation.reviewer_name ?? `User ${annotation.reviewer_id}`} / {formatDateTime(annotation.created_at)}
                </p>
              </div>
            ))}
          </div>
        </SummaryCard>
      )}

      {uploadedDraft && context.blocking_reasons && context.blocking_reasons.length > 0 && (
        <SummaryCard title="Design Review Status">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {context.blocking_reasons.join(" ")}
          </div>
        </SummaryCard>
      )}

      {uploadedDraft && !showDesignFeedbackWorkspace && request.status === "DESIGN_APPROVED" && (
        <SummaryCard title="Design Review Status">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Design draft approved.
          </div>
        </SummaryCard>
      )}

      {isApproveModalOpen && (
        <Modal title="Approve Design Draft" onClose={() => setIsApproveModalOpen(false)}>
          <form className="space-y-4" onSubmit={handleApprove}>
            {hasBlockingMandatoryComments && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Resolve mandatory design review comments before approving the design draft.
              </div>
            )}
            {!hasBlockingMandatoryComments && nonMandatoryOpenDesignReviewAnnotations.length > 0 && (
              <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                Open design comments exist. Resolve them or request a revision before approving.
              </div>
            )}
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision Notes</span>
              <textarea
                className="block min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={approveNotes}
                onChange={(event) => setApproveNotes(event.target.value)}
                required
                disabled={isActionLoading || hasBlockingMandatoryComments}
              />
            </label>
            <label className="flex gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmContentUnchanged}
                onChange={(event) => setConfirmContentUnchanged(event.target.checked)}
                disabled={isActionLoading || hasBlockingMandatoryComments}
                required
              />
              <span>I confirm the design follows the approved medical content.</span>
            </label>
            <label className="flex gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmDesignBriefFollowed}
                onChange={(event) => setConfirmDesignBriefFollowed(event.target.checked)}
                disabled={isActionLoading || hasBlockingMandatoryComments}
                required
              />
              <span>I confirm the design follows the submitted design brief.</span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setIsApproveModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={
                  isActionLoading ||
                  hasBlockingMandatoryComments ||
                  !approveNotes.trim() ||
                  !confirmContentUnchanged ||
                  !confirmDesignBriefFollowed
                }
              >
                Approve Design Draft
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isRevisionModalOpen && uploadedDraft && (
        <Modal title="Continue Revision Request" onClose={() => setIsRevisionModalOpen(false)}>
          <form className="space-y-4" onSubmit={handleRequestRevision}>
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
              <DetailRow label="Open Comments" value={designReviewAnnotationSummary.open} />
              <DetailRow label="Mandatory Open" value={designReviewAnnotationSummary.mandatory_open} />
              <DetailRow label="Resolved" value={designReviewAnnotationSummary.resolved} />
              <DetailRow label="Draft" value={uploadedDraft.draft_label} />
              <DetailRow label="Iteration" value={`${currentIteration || uploadedDraft.draft_number} of ${iterationLimit}`} />
            </div>

            {openDesignReviewAnnotations.length === 0 && (
              <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                No visual comments added. Add pins or boxes so the Designer can clearly locate issues.
              </div>
            )}

            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revision Reason</span>
              <select
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={revisionReason}
                onChange={(event) => setRevisionReason(event.target.value)}
                disabled={isActionLoading || !canOpenRevisionDecision}
              >
                {revisionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revision Notes</span>
              <textarea
                className="block min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={revisionNotes}
                onChange={(event) => setRevisionNotes(event.target.value)}
                disabled={isActionLoading || !canOpenRevisionDecision}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {changeChecklist.map((item) => (
                <label key={item} className="flex gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={requestedChanges.includes(item)}
                    onChange={() => toggleRequestedChange(item)}
                    disabled={isActionLoading || !canOpenRevisionDecision}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</span>
              <input
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                type="date"
                value={revisionDueDate}
                onChange={(event) => setRevisionDueDate(event.target.value)}
                disabled={isActionLoading || !canOpenRevisionDecision}
              />
            </label>

            <div className="rounded-md border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Included Visual Comments
              </div>
              {openDesignReviewAnnotations.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-600">No open design review comments.</div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {openDesignReviewAnnotations.map((annotation) => (
                    <div key={annotation.id} className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                        <span>{annotationAnchorLabel(annotation)}</span>
                        {annotation.severity && <span>{annotation.severity}</span>}
                        {annotation.is_mandatory_change && <span>Mandatory</span>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{annotation.comment_text}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {annotation.reviewer_name ?? `User ${annotation.reviewer_id}`} / {formatDateTime(annotation.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setIsRevisionModalOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={
                  isActionLoading ||
                  !canOpenRevisionDecision ||
                  (openDesignReviewAnnotations.length === 0 && !revisionNotes.trim())
                }
              >
                Request Design Revision
              </button>
            </div>
          </form>
        </Modal>
      )}

    </PageContainer>
  );
}

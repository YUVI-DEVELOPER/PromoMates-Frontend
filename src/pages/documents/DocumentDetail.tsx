import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import {
  deleteAsset,
  downloadAsset,
  getDocumentAssets,
} from "../../api/assets";
import {
  createContentWorkspaceDraftVersion,
  getContentWorkspaceDetail,
  getDocumentContentVersions,
} from "../../api/contentVersions";
import {
  getDocument,
  getDocumentHistory,
  getDocumentVersions,
  updateDocumentStatus,
  withdrawDocument,
} from "../../api/documents";
import {
  getDocumentComplianceRecords,
  getOrCreateContentVersionComplianceRecord,
  issueMlrCode,
  updateComplianceRecord,
} from "../../api/legalCompliance";
import {
  createReviewAnnotation,
  dismissReviewAnnotation,
  getDocumentReviewAnnotations,
  reopenReviewAnnotation,
  resolveReviewAnnotation,
} from "../../api/reviewAnnotations";
import { getDocumentReviews, getReview } from "../../api/reviews";
import { AssetUploadPanel } from "../../components/assets/AssetUploadPanel";
import { AssetVersionsTable } from "../../components/assets/AssetVersionsTable";
import { PrimaryAssetCard } from "../../components/assets/PrimaryAssetCard";
import { ContentVersionsSection } from "../../components/content-versions/ContentVersionsSection";
import { DocumentHistoryTimeline } from "../../components/documents/DocumentHistoryTimeline";
import { DocumentVersionsTable } from "../../components/documents/DocumentVersionsTable";
import { ReviewSummaryCard } from "../../components/reviews/ReviewSummaryCard";
import { ComplianceRecordPanel } from "../../components/reviews/ComplianceRecordPanel";
import { ReviewAnnotationsPanel } from "../../components/reviews/ReviewAnnotationsPanel";
import { ReviewTasksTable } from "../../components/reviews/ReviewTasksTable";
import { SubmitReviewPanel } from "../../components/reviews/SubmitReviewPanel";
import { ContentViewer } from "../../components/viewer/ContentViewer";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { TabbedWorkspace, type WorkspaceTab } from "../../components/ui/TabbedWorkspace";
import { WorkflowStepper, type WorkflowStep } from "../../components/ui/WorkflowStepper";
import { LoadingState } from "../../components/ui/LoadingState";
import { useAuth } from "../../context/AuthContext";
import type { Asset, ViewerAsset } from "../../types/asset";
import type { ContentVersion, ContentWorkspaceDetail } from "../../types/contentVersion";
import { contentAuthoringModeLabels } from "../../types/contentVersion";
import type {
  DocumentDetail as DocumentDetailType,
  DocumentStateHistory,
  DocumentStatus,
  DocumentVersion,
} from "../../types/document";
import type {
  LegalComplianceRecord,
  LegalComplianceRecordIssueCodePayload,
  LegalComplianceRecordUpdatePayload,
} from "../../types/legalCompliance";
import type { ReviewAnnotation, ReviewAnnotationCreatePayload } from "../../types/reviewAnnotation";
import type { Review, SubmitReviewResponse } from "../../types/review";
import { getApiErrorMessage } from "../../utils/apiError";
import { canAccessRequests, canManageDocumentWorkspace } from "../../utils/access";
import { formatFileSize } from "../../utils/fileSize";
import { PERMISSIONS } from "../../utils/permissions";


type DetailTab = "overview" | "files" | "content" | "preview" | "review" | "versions" | "history";


type LocationState = {
  successMessage?: string;
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

const draftVersionAllowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const draftVersionAllowedExtensions = [".pdf", ".docx", ".pptx"];
const draftVersionMaxFileSizeBytes = 50 * 1024 * 1024;
const therapyAlignmentStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const medicalReviewStatusMessages: Record<string, string> = {
  SUBMITTED_FOR_MEDICAL_REVIEW: "Medical Review task has been created.",
  MEDICAL_REVIEW_IN_PROGRESS: "Medical Reviewer is reviewing this draft.",
  MEDICAL_CONTENT_APPROVED: "Medical content is approved and ready for design brief creation.",
  MEDICAL_REVISION_REQUIRED: "Medical requested revision; Therapy Lead must revise and resubmit.",
};


function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function displayReference(name: string | undefined | null, id: number | null): string {
  if (name) {
    return name;
  }

  return id ? `ID ${id}` : "Not set";
}


function getDaysToExpiry(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const today = new Date();
  const expiry = new Date(value);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((expiry.getTime() - today.getTime()) / millisecondsPerDay);

  if (Number.isNaN(days)) {
    return "Not set";
  }

  if (days < 0) {
    return `${Math.abs(days)} days overdue`;
  }

  if (days === 0) {
    return "Expires today";
  }

  return `${days} days`;
}


function stepStatus(
  documentStatus: DocumentStatus,
  step: "draft" | "file" | "ready" | "review" | "approved" | "published",
  hasPrimaryAsset: boolean,
): WorkflowStep["status"] {
  if (documentStatus === "REJECTED" && (step === "review" || step === "approved")) {
    return "failed";
  }

  if (step === "draft") {
    return documentStatus === "DRAFT" || documentStatus === "CHANGES_REQUESTED"
      ? "current"
      : "completed";
  }

  if (step === "file") {
    if (hasPrimaryAsset) {
      return "completed";
    }
    return documentStatus === "DRAFT" || documentStatus === "CHANGES_REQUESTED"
      ? "current"
      : "pending";
  }

  if (step === "ready") {
    if (documentStatus === "READY_FOR_REVIEW") {
      return "current";
    }
    return ["IN_REVIEW", "APPROVED"].includes(documentStatus) ? "completed" : "pending";
  }

  if (step === "review") {
    if (documentStatus === "IN_REVIEW") {
      return "current";
    }
    return documentStatus === "APPROVED" ? "completed" : "pending";
  }

  if (step === "approved") {
    return documentStatus === "APPROVED" ? "current" : "pending";
  }

  return "pending";
}


function getWorkflowSteps(document: DocumentDetailType, primaryAsset: Asset | null): WorkflowStep[] {
  const hasPrimaryAsset = Boolean(primaryAsset);

  return [
    {
      label: "Draft",
      status: stepStatus(document.status, "draft", hasPrimaryAsset),
      helperText: "Metadata created",
      timestamp: formatDateTime(document.created_at),
    },
    {
      label: "File Uploaded",
      status: stepStatus(document.status, "file", hasPrimaryAsset),
      helperText: hasPrimaryAsset ? "Primary asset available" : "Awaiting primary asset",
      timestamp: primaryAsset ? formatDateTime(primaryAsset.created_at) : undefined,
    },
    {
      label: "Ready for Review",
      status: stepStatus(document.status, "ready", hasPrimaryAsset),
      helperText: "Package ready for MLR intake",
    },
    {
      label: "MLR Review",
      status: stepStatus(document.status, "review", hasPrimaryAsset),
      helperText: "Review workflow phase",
    },
    {
      label: "Approved",
      status: stepStatus(document.status, "approved", hasPrimaryAsset),
      helperText: "Final compliant asset",
    },
    {
      label: "Released",
      status: stepStatus(document.status, "published", hasPrimaryAsset),
      helperText: "Distribution phase",
    },
  ];
}


function getPreferredComplianceContentVersion(versions: ContentVersion[]): ContentVersion | null {
  const currentMlr = [...versions]
    .filter((version) => version.content_stage === "MLR_REVIEW" && version.is_current)
    .sort((left, right) => {
      if (left.version_number !== right.version_number) {
        return right.version_number - left.version_number;
      }
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })[0];
  if (currentMlr) {
    return currentMlr;
  }

  return [...versions].sort((left, right) => {
    if (left.is_current !== right.is_current) {
      return left.is_current ? -1 : 1;
    }
    if (left.version_number !== right.version_number) {
      return right.version_number - left.version_number;
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  })[0] ?? null;
}


function getPrimaryComplianceRecord(records: LegalComplianceRecord[]): LegalComplianceRecord | null {
  return [...records].sort((left, right) => {
    const leftIssued = left.record_status === "CODE_ISSUED";
    const rightIssued = right.record_status === "CODE_ISSUED";
    if (leftIssued !== rightIssued) {
      return leftIssued ? -1 : 1;
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  })[0] ?? null;
}


function isDraftContentVersion(version: ContentVersion): boolean {
  return version.version_type === "DRAFT" || version.content_stage === "DRAFT";
}


function sortDraftVersions(versions: ContentVersion[]): ContentVersion[] {
  return [...versions].sort((left, right) => {
    if (left.version_number !== right.version_number) {
      return right.version_number - left.version_number;
    }
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}


function validateDraftVersionFile(file: File): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!draftVersionAllowedMimeTypes.has(file.type) && !draftVersionAllowedExtensions.includes(extension)) {
    return "Unsupported file type. Upload a DOCX, PPTX, or PDF file.";
  }
  if (file.size <= 0) {
    return "Uploaded file must not be empty.";
  }
  if (file.size > draftVersionMaxFileSizeBytes) {
    return "Uploaded file exceeds the 50 MB limit.";
  }
  return null;
}


export function DocumentDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const [document, setDocument] = useState<DocumentDetailType | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [contentWorkspaceDetail, setContentWorkspaceDetail] = useState<ContentWorkspaceDetail | null>(null);
  const [reviewAnnotations, setReviewAnnotations] = useState<ReviewAnnotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [complianceRecords, setComplianceRecords] = useState<LegalComplianceRecord[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [history, setHistory] = useState<DocumentStateHistory[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isAnnotationLoading, setIsAnnotationLoading] = useState(false);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);
  const [annotationErrorMessage, setAnnotationErrorMessage] = useState<string | null>(null);
  const [complianceErrorMessage, setComplianceErrorMessage] = useState<string | null>(null);
  const [contentWorkspaceErrorMessage, setContentWorkspaceErrorMessage] = useState<string | null>(null);
  const [draftVersionErrorMessage, setDraftVersionErrorMessage] = useState<string | null>(null);
  const [isDraftVersionModalOpen, setIsDraftVersionModalOpen] = useState(false);
  const [draftVersionForm, setDraftVersionForm] = useState({
    version_label: "Draft V1",
    draft_notes: "",
    change_summary: "Initial Therapy Lead draft created from approved content request.",
  });
  const [draftVersionFile, setDraftVersionFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    const state = location.state as LocationState | null;
    return state?.successMessage ?? null;
  });
  const numericDocumentId = Number(documentId);
  const isAdmin = hasPermission(PERMISSIONS.MANAGE_SYSTEM);
  const canOpenRequests = canAccessRequests(hasPermission);
  const canManageWorkspace = canManageDocumentWorkspace(hasPermission);
  const primaryAsset = assets.find((asset) => asset.is_primary && !asset.is_deleted) ?? null;
  const isOwner = Boolean(document && user?.id === document.owner_id);
  const isRequestCreator = Boolean(
    document?.material_request && user?.id === document.material_request.requested_by_id,
  );
  const canEdit =
    Boolean(document) &&
    canManageWorkspace &&
    (isAdmin ||
      (isOwner &&
        (document?.status === "DRAFT" || document?.status === "CHANGES_REQUESTED")));
  const canMarkReady =
    Boolean(document) &&
    canManageWorkspace &&
    (isAdmin || isOwner) &&
    (document?.status === "DRAFT" || document?.status === "CHANGES_REQUESTED");
  const canWithdraw =
    Boolean(document) &&
    canManageWorkspace &&
    document?.status !== "WITHDRAWN" &&
    (isAdmin || (isOwner && document?.status === "DRAFT"));
  const canUploadFiles = Boolean(document) && canManageWorkspace && (isAdmin || isOwner);
  const canResolveAnnotations =
    isAdmin || isOwner || isRequestCreator || hasPermission(PERMISSIONS.RESOLVE_REVIEW_ANNOTATION);
  const canReopenAnnotations =
    isAdmin ||
    hasPermission(PERMISSIONS.ADD_REVIEW_ANNOTATION) ||
    reviewAnnotations.some((annotation) => annotation.reviewer_id === user?.id);
  const canUpdateCompliance = hasPermission(PERMISSIONS.UPDATE_COMPLIANCE_CHECKLIST);
  const canIssueCompliance = hasPermission(PERMISSIONS.ISSUE_MLR_CODE);
  const preferredComplianceContentVersion = getPreferredComplianceContentVersion(contentVersions);
  const currentComplianceRecord = getPrimaryComplianceRecord(complianceRecords);
  const workspaceDraftVersions = useMemo(() => {
    const versions = contentWorkspaceDetail?.draft_versions?.length
      ? contentWorkspaceDetail.draft_versions
      : contentVersions.filter(isDraftContentVersion);
    return sortDraftVersions(versions);
  }, [contentVersions, contentWorkspaceDetail]);
  const currentDraftVersion =
    contentWorkspaceDetail?.current_draft_version ??
    workspaceDraftVersions.find((version) => version.is_current) ??
    workspaceDraftVersions[0] ??
    null;
  const nextDraftVersionNumber = (workspaceDraftVersions[0]?.version_number ?? contentWorkspaceDetail?.draft_versions_count ?? 0) + 1;
  const linkedWorkspaceRequest = contentWorkspaceDetail?.linked_request ?? null;
  const isAssignedTherapyLead = Boolean(
    linkedWorkspaceRequest?.assigned_therapy_lead_id &&
      user?.id === linkedWorkspaceRequest.assigned_therapy_lead_id,
  );
  const canCreateDraftVersion =
    Boolean(document?.is_content_workspace) &&
    ["DRAFT_IN_PROGRESS", "MEDICAL_REVISION_IN_PROGRESS"].includes(document?.status ?? "") &&
    ["DRAFT_IN_PROGRESS", "MEDICAL_REVISION_IN_PROGRESS"].includes(linkedWorkspaceRequest?.status ?? "") &&
    (isAdmin || isAssignedTherapyLead) &&
    (isAdmin ||
      hasPermission(PERMISSIONS.MANAGE_CONTENT_VERSIONS) ||
      hasPermission(PERMISSIONS.CREATE_CONTENT_DRAFT) ||
      hasPermission(PERMISSIONS.AUTHOR_CONTENT));

  const refreshDocumentReviews = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      return;
    }

    setIsReviewLoading(true);
    setReviewErrorMessage(null);

    try {
      const response = await getDocumentReviews(numericDocumentId);
      const detailedReviews = await Promise.all(
        response.items.map((review) => getReview(review.id)),
      );
      setReviews(detailedReviews);
    } catch (error) {
      setReviews([]);
      setReviewErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsReviewLoading(false);
    }
  }, [numericDocumentId]);

  const refreshAssets = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      return;
    }

    const nextAssets = await getDocumentAssets(numericDocumentId);
    setAssets(nextAssets);
  }, [numericDocumentId]);

  const refreshContentVersions = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      return;
    }

    const response = await getDocumentContentVersions(numericDocumentId, { page_size: 100 });
    setContentVersions(response.items);
  }, [numericDocumentId]);

  const refreshReviewAnnotations = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      return;
    }

    setIsAnnotationLoading(true);
    setAnnotationErrorMessage(null);

    try {
      const response = await getDocumentReviewAnnotations(numericDocumentId, { page_size: 100 });
      setReviewAnnotations(response.items);
    } catch (error) {
      setReviewAnnotations([]);
      setAnnotationErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAnnotationLoading(false);
    }
  }, [numericDocumentId]);

  const refreshComplianceRecords = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      return;
    }
    setIsComplianceLoading(true);
    setComplianceErrorMessage(null);
    try {
      const response = await getDocumentComplianceRecords(numericDocumentId, { page_size: 100 });
      setComplianceRecords(response.items);
    } catch (error) {
      setComplianceRecords([]);
      setComplianceErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsComplianceLoading(false);
    }
  }, [numericDocumentId]);

  const refreshFilesAndContent = useCallback(async () => {
    await Promise.all([refreshAssets(), refreshContentVersions()]);
  }, [refreshAssets, refreshContentVersions]);

  const fetchDocumentBundle = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      setErrorMessage("Document not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setReviewErrorMessage(null);
    setContentWorkspaceErrorMessage(null);

    try {
      const [
        nextDocument,
        nextAssets,
        nextContentVersions,
        nextAnnotations,
        nextComplianceRecords,
        nextVersions,
        nextHistory,
      ] = await Promise.all([
        getDocument(numericDocumentId),
        getDocumentAssets(numericDocumentId),
        getDocumentContentVersions(numericDocumentId, { page_size: 100 }),
        getDocumentReviewAnnotations(numericDocumentId, { page_size: 100 }),
        getDocumentComplianceRecords(numericDocumentId, { page_size: 100 }),
        getDocumentVersions(numericDocumentId),
        getDocumentHistory(numericDocumentId),
      ]);

      let nextContentWorkspaceDetail: ContentWorkspaceDetail | null = null;
      let nextContentWorkspaceErrorMessage: string | null = null;
      if (nextDocument.is_content_workspace) {
        try {
          nextContentWorkspaceDetail = await getContentWorkspaceDetail(nextDocument.id);
        } catch (error) {
          nextContentWorkspaceErrorMessage = getApiErrorMessage(error);
        }
      }

      setDocument(nextDocument);
      setAssets(nextAssets);
      setContentVersions(nextContentVersions.items);
      setContentWorkspaceDetail(nextContentWorkspaceDetail);
      setContentWorkspaceErrorMessage(nextContentWorkspaceErrorMessage);
      setReviewAnnotations(nextAnnotations.items);
      setComplianceRecords(nextComplianceRecords.items);
      setVersions(nextVersions);
      setHistory(nextHistory);
      await refreshDocumentReviews();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [numericDocumentId, refreshDocumentReviews]);

  useEffect(() => {
    void fetchDocumentBundle();
  }, [fetchDocumentBundle]);

  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  async function handleMarkReady() {
    if (!document) {
      return;
    }

    if (!primaryAsset) {
      setActiveTab("files");
      setErrorMessage("Please upload a document file before marking ready for review.");
      setSuccessMessage(null);
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateDocumentStatus(document.id, {
        to_status: "READY_FOR_REVIEW",
        reason: "Metadata completed",
      });
      setSuccessMessage("Document marked ready for review.");
      await fetchDocumentBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleReviewSubmitted(_: SubmitReviewResponse) {
    setSuccessMessage("Document submitted for MLR review.");
    setErrorMessage(null);
    setActiveTab("review");
    await fetchDocumentBundle();
  }

  async function handleWithdraw() {
    if (!document) {
      return;
    }

    if (!window.confirm(`Withdraw ${document.document_number}?`)) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const withdrawnDocument = await withdrawDocument(document.id);
      setDocument(withdrawnDocument);
      setSuccessMessage("Document withdrawn.");

      if (isAdmin) {
        const [nextAssets, nextVersions, nextHistory] = await Promise.all([
          getDocumentAssets(document.id),
          getDocumentVersions(document.id),
          getDocumentHistory(document.id),
        ]);
        setAssets(nextAssets);
        setVersions(nextVersions);
        setHistory(nextHistory);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDownloadAsset(asset: ViewerAsset) {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await downloadAsset(asset.id, asset.original_filename);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleDeleteAsset(asset: Asset) {
    if (!window.confirm(`Delete ${asset.original_filename}? The stored file will remain archived.`)) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteAsset(asset.id);
      setSuccessMessage("Asset deleted.");
      await refreshFilesAndContent();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDownloadContentVersion(version: ContentVersion) {
    if (!version.asset) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await downloadAsset(version.asset.id, version.asset.original_filename);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  function openDraftVersionModal() {
    setDraftVersionForm({
      version_label: `Draft V${nextDraftVersionNumber}`,
      draft_notes: "",
      change_summary: "Initial Therapy Lead draft created from approved content request.",
    });
    setDraftVersionFile(null);
    setDraftVersionErrorMessage(null);
    setIsDraftVersionModalOpen(true);
  }

  function handleDraftVersionFileChange(file: File | null) {
    if (!file) {
      setDraftVersionFile(null);
      setDraftVersionErrorMessage(null);
      return;
    }

    const validationError = validateDraftVersionFile(file);
    if (validationError) {
      setDraftVersionFile(null);
      setDraftVersionErrorMessage(validationError);
      return;
    }

    setDraftVersionFile(file);
    setDraftVersionErrorMessage(null);
  }

  async function handleCreateDraftVersion() {
    if (!document?.is_content_workspace) {
      return;
    }

    const changeSummary = draftVersionForm.change_summary.trim();
    const draftNotes = draftVersionForm.draft_notes.trim();
    if (!changeSummary) {
      setDraftVersionErrorMessage("Change summary is required.");
      return;
    }
    if (!draftNotes && !draftVersionFile) {
      setDraftVersionErrorMessage("Please provide draft notes or upload a draft file.");
      return;
    }

    setIsActionLoading(true);
    setDraftVersionErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createContentWorkspaceDraftVersion(document.id, {
        version_label: draftVersionForm.version_label,
        draft_notes: draftNotes || null,
        change_summary: changeSummary,
        draft_file: draftVersionFile,
      });
      setIsDraftVersionModalOpen(false);
      setSuccessMessage("Draft version created.");
      await fetchDocumentBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDraftVersionErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleCreateAnnotation(payload: ReviewAnnotationCreatePayload) {
    setAnnotationErrorMessage(null);
    try {
      await createReviewAnnotation(payload);
      await Promise.all([refreshReviewAnnotations(), refreshComplianceRecords()]);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAnnotationErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleResolveAnnotation(annotationId: string, resolutionNote: string | null) {
    setAnnotationErrorMessage(null);
    try {
      await resolveReviewAnnotation(annotationId, resolutionNote);
      await Promise.all([refreshReviewAnnotations(), refreshComplianceRecords()]);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAnnotationErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleReopenAnnotation(annotationId: string) {
    setAnnotationErrorMessage(null);
    try {
      await reopenReviewAnnotation(annotationId);
      await Promise.all([refreshReviewAnnotations(), refreshComplianceRecords()]);
    } catch (error) {
      setAnnotationErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleDismissAnnotation(annotationId: string, resolutionNote: string | null) {
    setAnnotationErrorMessage(null);
    try {
      await dismissReviewAnnotation(annotationId, resolutionNote);
      await Promise.all([refreshReviewAnnotations(), refreshComplianceRecords()]);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAnnotationErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleCreateComplianceRecord() {
    if (!preferredComplianceContentVersion) {
      setComplianceErrorMessage("No content version is available for this document.");
      return;
    }
    setComplianceErrorMessage(null);
    try {
      await getOrCreateContentVersionComplianceRecord(preferredComplianceContentVersion.id);
      await refreshComplianceRecords();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setComplianceErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleSaveCompliance(recordId: string, payload: LegalComplianceRecordUpdatePayload) {
    setComplianceErrorMessage(null);
    try {
      await updateComplianceRecord(recordId, payload);
      await refreshComplianceRecords();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setComplianceErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleIssueComplianceCode(recordId: string, payload: LegalComplianceRecordIssueCodePayload) {
    setComplianceErrorMessage(null);
    try {
      await issueMlrCode(recordId, payload);
      await refreshComplianceRecords();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setComplianceErrorMessage(message);
      throw new Error(message);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading document dashboard..." rows={4} />
      </PageContainer>
    );
  }

  if (!document) {
    return (
      <PageContainer>
        <ErrorState message={errorMessage || "Document not found."} />
        <Link to="/library" className={secondaryButtonClass}>
          Back to Content Library
        </Link>
      </PageContainer>
    );
  }

  const latestVersion = versions.reduce(
    (highest, version) => Math.max(highest, version.version_number),
    1,
  );
  const workflowSteps = getWorkflowSteps(document, primaryAsset);
  const reviewStatus = getStatusLabel(document.status);
  const fileStatus = primaryAsset ? `v${primaryAsset.version_number} uploaded` : "No file";
  const previewContentVersion = preferredComplianceContentVersion;
  const previewAsset = (previewContentVersion?.asset ?? primaryAsset) as ViewerAsset | null;
  const isRequestLinkedDesignReviewFile = Boolean(
    document.request_id &&
      (
        assets.some((asset) => asset.asset_type === "DESIGN_DRAFT" && !asset.is_deleted) ||
        contentVersions.some(
          (version) =>
            version.content_stage === "DESIGN" ||
            version.asset?.asset_type === "DESIGN_DRAFT",
        )
      ),
  );
  const tabs: WorkspaceTab<DetailTab>[] = [
    {
      id: "overview",
      label: "Overview",
      content: <Overview document={document} />,
    },
    {
      id: "files",
      label: "Files",
      helperText: "Upload is available only while the document is Draft or Changes Requested.",
      content: (
        <FilesSection
          document={document}
          assets={assets}
          primaryAsset={primaryAsset}
          canUpload={canUploadFiles}
          canDelete={isAdmin}
          isActionLoading={isActionLoading}
          onUploaded={refreshFilesAndContent}
          onDownload={handleDownloadAsset}
          onDelete={handleDeleteAsset}
        />
      ),
    },
    {
      id: "content",
      label: "Content Versions",
      content: (
        <ContentVersionsSection
          versions={contentVersions}
          subtitle="Draft, review, supporting, design, and final iterations tied to this document."
          onDownload={handleDownloadContentVersion}
        />
      ),
    },
    {
      id: "preview",
      label: "Preview & Annotations",
      content: (
        <div className="space-y-4">
          {isRequestLinkedDesignReviewFile && (
            <div className="flex flex-col gap-3 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 sm:flex-row sm:items-center sm:justify-between">
              <span>This file is part of a Design Review. Open Design Review to add stage-specific comments.</span>
              <Link to={`/requests/${document.request_id}/design`} className={secondaryButtonClass}>
                Open Design Review
              </Link>
            </div>
          )}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
            <ContentViewer
              asset={previewAsset}
              contentVersion={previewContentVersion}
              annotations={reviewAnnotations}
              selectedAnnotationId={selectedAnnotationId}
              canAnnotate={hasPermission(PERMISSIONS.ADD_REVIEW_ANNOTATION) && Boolean(previewContentVersion)}
              defaultCreatePayload={{
                request_id: document.request_id,
                document_id: document.id,
              }}
              onCreateAnnotation={handleCreateAnnotation}
              onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
              onDownload={handleDownloadAsset}
              title="Preview & Annotations"
              subtitle="Review the current content version and place page, image, or timestamp comments."
            />
            <ReviewAnnotationsPanel
              annotations={reviewAnnotations}
              isLoading={isAnnotationLoading}
              errorMessage={annotationErrorMessage}
              selectedAnnotationId={selectedAnnotationId}
              canAdd={hasPermission(PERMISSIONS.ADD_REVIEW_ANNOTATION) && Boolean(previewContentVersion)}
              canResolve={canResolveAnnotations}
              canDismiss={canResolveAnnotations}
              canReopen={canReopenAnnotations}
              defaultCreatePayload={{
                request_id: document.request_id,
                document_id: document.id,
                content_version_id: previewContentVersion?.id ?? null,
              }}
              onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
              onCreate={handleCreateAnnotation}
              onResolve={handleResolveAnnotation}
              onReopen={handleReopenAnnotation}
              onDismiss={handleDismissAnnotation}
            />
          </div>
        </div>
      ),
    },
    {
      id: "review",
      label: "Review",
      content: (
        <div className="space-y-5">
          <ReviewSection
            document={document}
            primaryAsset={primaryAsset}
            reviews={reviews}
            isLoading={isReviewLoading}
            errorMessage={reviewErrorMessage}
            currentUserId={user?.id}
            currentUserRoleIds={user?.roles.map((role) => role.id)}
            isAdmin={isAdmin}
            onSubmitted={handleReviewSubmitted}
          />
          <ReviewAnnotationsPanel
            annotations={reviewAnnotations}
            isLoading={isAnnotationLoading}
            errorMessage={annotationErrorMessage}
            canResolve={canResolveAnnotations}
            canDismiss={canResolveAnnotations}
            canReopen={canReopenAnnotations}
            onResolve={handleResolveAnnotation}
            onReopen={handleReopenAnnotation}
            onDismiss={handleDismissAnnotation}
          />
          <ComplianceRecordPanel
            record={currentComplianceRecord}
            contentVersionId={preferredComplianceContentVersion?.id ?? null}
            isLoading={isComplianceLoading}
            errorMessage={complianceErrorMessage}
            subtitle="Complete the compliance checklist and issue an MLR code after approval."
            canCreate={canUpdateCompliance}
            canEditChecklist={canUpdateCompliance}
            canIssueCode={canIssueCompliance}
            onCreate={async () => {
              await handleCreateComplianceRecord();
            }}
            onSave={handleSaveCompliance}
            onIssueCode={handleIssueComplianceCode}
          />
        </div>
      ),
    },
    {
      id: "versions",
      label: "Versions",
      content: <DocumentVersionsTable versions={versions} isLoading={false} />,
    },
    {
      id: "history",
      label: "State History",
      content: <DocumentHistoryTimeline history={history} isLoading={false} />,
    },
  ];

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow={document.document_number}
        title={document.title}
        subtitle="Document dashboard for metadata, file versions, status history, and review readiness."
        status={document.status}
        metadata={[
          {
            label: "Brand / Product / Country",
            value: `${displayReference(document.brand?.name, document.brand_id)} / ${displayReference(
              document.product?.name,
              document.product_id,
            )} / ${displayReference(document.country?.name, document.country_id)}`,
          },
          {
            label: "Content Request",
            value: document.material_request && canOpenRequests ? (
              <Link to={`/requests/${document.material_request.id}`} className="text-brand-700 hover:text-brand-600">
                {document.material_request.request_number}
              </Link>
            ) : document.material_request ? (
              document.material_request.request_number
            ) : (
              "Not linked"
            ),
          },
          { label: "Owner", value: document.owner?.full_name ?? `User ${document.owner_id}` },
          { label: "Expiry Date", value: formatDate(document.expiry_date) },
        ]}
        primaryAction={getPrimaryAction({
          document,
          primaryAsset,
          canManageWorkspace,
          canMarkReady,
          canSubmitReview: isAdmin || isOwner,
          isActionLoading,
          onDownload: handleDownloadAsset,
          onMarkReady: handleMarkReady,
          onOpenFiles: () => setActiveTab("files"),
          onOpenReview: () => setActiveTab("review"),
        })}
        secondaryAction={
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Link to="/library" className={secondaryButtonClass}>
              Back to Content Library
            </Link>
            {document.material_request && canOpenRequests && (
              <Link to={`/requests/${document.material_request.id}`} className={secondaryButtonClass}>
                Back to Request
              </Link>
            )}
            {canEdit && (
              <Link to={`/library/${document.id}/edit`} className={secondaryButtonClass}>
                Edit Metadata
              </Link>
            )}
            {canWithdraw && (
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isActionLoading}
                className={dangerButtonClass}
              >
                Withdraw
              </button>
            )}
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

      {canMarkReady && !primaryAsset && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Upload a primary document file before marking this record ready for review.
        </div>
      )}

      {document.is_content_workspace && (
        <ContentWorkspaceDraftPanel
          document={document}
          detail={contentWorkspaceDetail}
          errorMessage={contentWorkspaceErrorMessage}
          currentDraftVersion={currentDraftVersion}
          draftVersions={workspaceDraftVersions}
          canCreateDraftVersion={canCreateDraftVersion}
          isActionLoading={isActionLoading}
          canOpenRequests={canOpenRequests}
          onCreateDraftVersion={openDraftVersionModal}
          onDownloadContentVersion={handleDownloadContentVersion}
        />
      )}

      <WorkflowStepper
        title="Document Lifecycle"
        subtitle="Current status is shown in context with file readiness and future review stages."
        steps={workflowSteps}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Current Version"
          value={`v${latestVersion}`}
          helperText="Latest metadata version"
          status="info"
        />
        <KpiCard
          label="File Status"
          value={fileStatus}
          helperText={primaryAsset ? primaryAsset.original_filename : "Primary asset required"}
          status={primaryAsset ? "success" : "warning"}
        />
        <KpiCard
          label="Review Status"
          value={reviewStatus}
          helperText="Workflow phase for this document"
          status={document.status === "APPROVED" ? "success" : "neutral"}
        />
        <KpiCard
          label="Days to Expiry"
          value={getDaysToExpiry(document.expiry_date)}
          helperText={formatDate(document.expiry_date)}
          status="neutral"
        />
      </div>

      <TabbedWorkspace tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {isDraftVersionModalOpen && document.is_content_workspace && (
        <DraftVersionModal
          workspaceTitle={document.title}
          form={draftVersionForm}
          file={draftVersionFile}
          errorMessage={draftVersionErrorMessage}
          isSubmitting={isActionLoading}
          onChange={setDraftVersionForm}
          onFileChange={handleDraftVersionFileChange}
          onClose={() => setIsDraftVersionModalOpen(false)}
          onSubmit={handleCreateDraftVersion}
        />
      )}
    </PageContainer>
  );
}


type ContentWorkspaceDraftPanelProps = {
  document: DocumentDetailType;
  detail: ContentWorkspaceDetail | null;
  errorMessage: string | null;
  currentDraftVersion: ContentVersion | null;
  draftVersions: ContentVersion[];
  canCreateDraftVersion: boolean;
  isActionLoading: boolean;
  canOpenRequests: boolean;
  onCreateDraftVersion: () => void;
  onDownloadContentVersion: (version: ContentVersion) => void;
};


function ContentWorkspaceDraftPanel({
  document,
  detail,
  errorMessage,
  currentDraftVersion,
  draftVersions,
  canCreateDraftVersion,
  isActionLoading,
  canOpenRequests,
  onCreateDraftVersion,
  onDownloadContentVersion,
}: ContentWorkspaceDraftPanelProps) {
  const linkedRequest = detail?.linked_request ?? document.material_request ?? null;
  const alignmentRequest = detail?.linked_request ?? null;
  const referenceMaterials = detail?.reference_materials ?? [];
  const therapyAlignmentCompleted =
    alignmentRequest?.medical_submission_readiness?.therapy_alignment_completed ??
    alignmentRequest?.therapy_alignment_status === "COMPLETED";
  const medicalReviewPlaceholder = therapyAlignmentCompleted
    ? "Ready for Medical Review submission from the linked request."
    : "Complete Therapy Alignment before submitting to Medical Review.";
  const medicalReviewTask = detail?.medical_review_task_summary ?? null;
  const medicalSubmissionStatus = detail?.medical_submission_status ?? linkedRequest?.status ?? document.status;
  const medicalReviewStatusMessage =
    medicalReviewStatusMessages[medicalSubmissionStatus] ?? "Medical Review task has been created.";
  const approvedMedicalVersion = detail?.approved_medical_content_version ?? null;
  const activeDesignBrief = detail?.active_design_brief ?? null;
  const designTask = detail?.design_task_summary ?? null;

  return (
    <SummaryCard title="Content Dashboard">
      <div className="space-y-5">
        {errorMessage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Dashboard Code" value={document.document_number} />
            <DetailRow label="Dashboard Status" value={<StatusBadge status={document.status} />} />
            <DetailRow label="Dashboard Title" value={document.title} />
            <DetailRow
              label="Linked Request"
              value={
                linkedRequest ? (
                  canOpenRequests ? (
                    <Link to={`/requests/${linkedRequest.id}`} className="text-brand-700 hover:text-brand-600">
                      {linkedRequest.request_number ?? linkedRequest.title ?? linkedRequest.id}
                    </Link>
                  ) : (
                    linkedRequest.request_number ?? linkedRequest.title ?? linkedRequest.id
                  )
                ) : (
                  "Not linked"
                )
              }
            />
          </dl>

          <div className="space-y-4">
            <DetailBlock
              title="Regional Evaluation Notes"
              value={detail?.regional_evaluation_notes || "No regional evaluation notes recorded."}
            />
            <DetailBlock
              title="Regional Decision Reason"
              value={detail?.regional_decision_reason || "No regional decision reason recorded."}
            />
          </div>
        </div>

        {alignmentRequest && (
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Therapy Alignment</p>
                <p className="mt-1 text-sm text-slate-600">
                  {therapyAlignmentStatusLabels[alignmentRequest.therapy_alignment_status ?? "PENDING"] ??
                    alignmentRequest.therapy_alignment_status ??
                    "Pending"}
                </p>
              </div>
              <StatusBadge status={alignmentRequest.therapy_alignment_status ?? "PENDING"} />
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Open Comments" value={String(alignmentRequest.open_therapy_alignment_comment_count ?? 0)} />
              <DetailRow
                label="Completed At"
                value={alignmentRequest.therapy_alignment_completed_at ? formatDateTime(alignmentRequest.therapy_alignment_completed_at) : "Not completed"}
              />
            </dl>
            {alignmentRequest.therapy_alignment_status === "COMPLETED" && alignmentRequest.therapy_alignment_summary && (
              <div className="mt-4">
                <DetailBlock title="Summary" value={alignmentRequest.therapy_alignment_summary} />
              </div>
            )}
            {canOpenRequests && (
              <Link
                to={`/requests/${alignmentRequest.id}#therapy-alignment`}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open Alignment Panel
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            {currentDraftVersion ? (
              <WorkspaceDraftVersionCard version={currentDraftVersion} onDownload={onDownloadContentVersion} />
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No draft versions yet.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {canCreateDraftVersion && (
                <Link to={`/documents/${document.id}/authoring`} className={primaryButtonClass}>
                  Open Authoring Studio
                </Link>
              )}
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={!canCreateDraftVersion || isActionLoading}
                onClick={onCreateDraftVersion}
              >
                {currentDraftVersion ? "Upload New Draft File" : "Upload Draft File"}
              </button>
              {currentDraftVersion && (
                canOpenRequests && linkedRequest && !medicalReviewTask ? (
                  <Link to={`/requests/${linkedRequest.id}`} className={secondaryButtonClass}>
                    Open Request To Submit
                  </Link>
                ) : null
              )}
            </div>
            {currentDraftVersion && medicalReviewTask ? (
              <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-sky-950">Medical Review Submitted</p>
                    <p className="mt-1">
                      {detail?.medical_submission_status ?? "SUBMITTED_FOR_MEDICAL_REVIEW"}
                    </p>
                  </div>
                  <StatusBadge status={medicalReviewTask.status} />
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Task Due" value={medicalReviewTask.due_at ? formatDateTime(medicalReviewTask.due_at) : "Not set"} />
                  <DetailRow label="Submitted At" value={detail?.submitted_at ? formatDateTime(detail.submitted_at) : "Not set"} />
                  <DetailRow
                    label="Submitted By"
                    value={detail?.submitted_by?.full_name ?? (detail?.submitted_by ? `User ${detail.submitted_by.id}` : "Not set")}
                  />
                  <DetailRow label="Task Type" value={medicalReviewTask.task_type} />
                </dl>
                <p className="mt-3 text-sm text-sky-800">
                  {medicalReviewStatusMessage}
                </p>
              </div>
            ) : currentDraftVersion ? (
              <p className="text-sm text-slate-500">
                {medicalReviewPlaceholder}
              </p>
            ) : null}
            {!canCreateDraftVersion && (
              <p className="text-xs font-medium text-slate-500">
                Draft version creation is available to the assigned Therapy Lead with content authoring permission.
              </p>
            )}

            {(approvedMedicalVersion || activeDesignBrief || designTask) && (
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-indigo-950">Design Brief Readiness</p>
                    <p className="mt-1">
                      {activeDesignBrief
                        ? "Structured design brief details are linked to this approved medical content."
                        : "Medical content is approved and ready for design brief creation."}
                    </p>
                  </div>
                  {activeDesignBrief ? <StatusBadge status={activeDesignBrief.status} /> : null}
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailRow
                    label="Approved Medical Version"
                    value={
                      approvedMedicalVersion
                        ? approvedMedicalVersion.version_label ?? `V${approvedMedicalVersion.version_number}`
                        : "Not found"
                    }
                  />
                  <DetailRow label="Design Brief" value={activeDesignBrief?.design_title ?? "Not created"} />
                  <DetailRow label="Design Format" value={activeDesignBrief?.design_format ?? "Not set"} />
                  <DetailRow label="Design Task" value={designTask ? getStatusLabel(designTask.status) : "Not created"} />
                </dl>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reference Materials
            </h3>
            {referenceMaterials.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No reference materials inherited from the request.</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
                {referenceMaterials.map((material) => (
                  <div key={material.id} className="px-3 py-2 text-sm">
                    <p className="font-medium text-slate-950">{material.original_filename}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {material.mime_type} / {formatFileSize(material.file_size)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <WorkspaceDraftVersionList versions={draftVersions} onDownload={onDownloadContentVersion} />
      </div>
    </SummaryCard>
  );
}


type WorkspaceDraftVersionCardProps = {
  version: ContentVersion;
  onDownload: (version: ContentVersion) => void;
};


function WorkspaceDraftVersionCard({ version, onDownload }: WorkspaceDraftVersionCardProps) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-emerald-950">
            Version {version.version_number}: {version.version_label ?? `Draft V${version.version_number}`}
          </p>
          <p className="mt-1">Current draft version</p>
        </div>
        <StatusBadge status={version.status} />
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailRow label="Created By" value={version.created_by?.full_name ?? `User ${version.created_by_id}`} />
        <DetailRow label="Created At" value={formatDateTime(version.created_at)} />
        <DetailRow label="Authoring Mode" value={contentAuthoringModeLabels[version.authoring_mode] ?? "File Upload"} />
        <DetailRow label="Draft Notes" value={version.draft_notes || "Not provided"} />
        <DetailRow label="Change Summary" value={version.change_summary || "Not provided"} />
        <DetailRow
          label="File"
          value={
            version.asset ? (
              <button
                type="button"
                className="font-semibold text-brand-700 hover:text-brand-600"
                onClick={() => onDownload(version)}
              >
                {version.asset.original_filename}
              </button>
            ) : (
              "No file attached"
            )
          }
        />
      </dl>
    </div>
  );
}


type WorkspaceDraftVersionListProps = {
  versions: ContentVersion[];
  onDownload: (version: ContentVersion) => void;
};


function WorkspaceDraftVersionList({ versions, onDownload }: WorkspaceDraftVersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No draft versions yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-950">Draft Version List</p>
      </div>
      <div className="divide-y divide-slate-200">
        {versions.map((version) => (
          <div key={version.id} className="grid gap-2 px-4 py-3 text-sm text-slate-700 lg:grid-cols-[0.6fr_1fr_0.8fr_0.7fr_0.6fr_1fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version</p>
              <p className="mt-1 font-semibold text-slate-950">V{version.version_number}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Label</p>
              <p className="mt-1">{version.version_label ?? "Draft"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={version.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</p>
              <p className="mt-1">{contentAuthoringModeLabels[version.authoring_mode] ?? "File Upload"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current?</p>
              <p className="mt-1">{version.is_current ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</p>
              <p className="mt-1">{version.created_by?.full_name ?? `User ${version.created_by_id}`}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(version.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">File / Change Summary</p>
              {version.asset ? (
                <button
                  type="button"
                  className="mt-1 block font-semibold text-brand-700 hover:text-brand-600"
                  onClick={() => onDownload(version)}
                >
                  {version.asset.original_filename}
                </button>
              ) : (
                <p className="mt-1 text-slate-500">No file attached</p>
              )}
              <p className="mt-1 text-xs text-slate-500">{version.change_summary || "No change summary"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


type DraftVersionFormState = {
  version_label: string;
  draft_notes: string;
  change_summary: string;
};


type DraftVersionModalProps = {
  workspaceTitle: string;
  form: DraftVersionFormState;
  file: File | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  onChange: Dispatch<SetStateAction<DraftVersionFormState>>;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSubmit: () => void;
};


function DraftVersionModal({
  workspaceTitle,
  form,
  file,
  errorMessage,
  isSubmitting,
  onChange,
  onFileChange,
  onClose,
  onSubmit,
}: DraftVersionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Upload Draft File</h2>
            <p className="mt-1 text-sm text-slate-500">{workspaceTitle}</p>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version Label</span>
            <input
              type="text"
              value={form.version_label}
              onChange={(event) => onChange((current) => ({ ...current, version_label: event.target.value }))}
              disabled={isSubmitting}
              maxLength={120}
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft Notes / Content Summary</span>
            <textarea
              value={form.draft_notes}
              onChange={(event) => onChange((current) => ({ ...current, draft_notes: event.target.value }))}
              disabled={isSubmitting}
              rows={5}
              maxLength={10000}
              className="mt-2 block min-h-[130px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Change Summary</span>
            <textarea
              value={form.change_summary}
              onChange={(event) => onChange((current) => ({ ...current, change_summary: event.target.value }))}
              disabled={isSubmitting}
              rows={3}
              maxLength={5000}
              className="mt-2 block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft File</span>
            <input
              type="file"
              accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              disabled={isSubmitting}
              className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              DOCX, PPTX, or PDF up to 50 MB. {file ? `Selected: ${file.name}` : ""}
            </p>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} onClick={onSubmit} disabled={isSubmitting}>
            Create File Upload Version
          </button>
        </div>
      </div>
    </div>
  );
}


type PrimaryActionContext = {
  document: DocumentDetailType;
  primaryAsset: Asset | null;
  canManageWorkspace: boolean;
  canMarkReady: boolean;
  canSubmitReview: boolean;
  isActionLoading: boolean;
  onDownload: (asset: Asset) => void;
  onMarkReady: () => void;
  onOpenFiles: () => void;
  onOpenReview: () => void;
};


function getPrimaryAction({
  document,
  primaryAsset,
  canManageWorkspace,
  canMarkReady,
  canSubmitReview,
  isActionLoading,
  onDownload,
  onMarkReady,
  onOpenFiles,
  onOpenReview,
}: PrimaryActionContext): ReactNode {
  if (!canManageWorkspace) {
    if (document.status === "APPROVED" && primaryAsset) {
      return (
        <button
          type="button"
          onClick={() => onDownload(primaryAsset)}
          className={primaryButtonClass}
        >
          Download Approved Material
        </button>
      );
    }

    return undefined;
  }

  if (
    (document.status === "DRAFT" || document.status === "CHANGES_REQUESTED") &&
    !primaryAsset
  ) {
    return (
      <button type="button" onClick={onOpenFiles} className={primaryButtonClass}>
        Upload Review File
      </button>
    );
  }

  if (canMarkReady && primaryAsset) {
    return (
      <button
        type="button"
        onClick={onMarkReady}
        disabled={isActionLoading}
        className={primaryButtonClass}
      >
        Mark Ready for Review
      </button>
    );
  }

  if (document.status === "READY_FOR_REVIEW" && primaryAsset) {
    if (canSubmitReview) {
      return (
        <button type="button" onClick={onOpenReview} className={primaryButtonClass}>
          Submit for MLR Review
        </button>
      );
    }

    return undefined;
  }

  if (document.status === "READY_FOR_REVIEW") {
    return (
      <button type="button" disabled className={secondaryButtonClass}>
        Primary File Missing
      </button>
    );
  }

  if (document.status === "IN_REVIEW") {
    return (
      <button type="button" disabled className={secondaryButtonClass}>
        Review in Progress
      </button>
    );
  }

  if (document.status === "APPROVED" && primaryAsset) {
    return (
      <button
        type="button"
        onClick={() => onDownload(primaryAsset)}
        className={primaryButtonClass}
      >
        Download Approved Material
      </button>
    );
  }

  if (document.status === "APPROVED") {
    return (
      <button type="button" disabled className={secondaryButtonClass}>
        Approved
      </button>
    );
  }

  if (document.status === "CHANGES_REQUESTED") {
    return (
      <button type="button" disabled className={secondaryButtonClass}>
        Changes Requested
      </button>
    );
  }

  if (document.status === "REJECTED") {
    return (
      <button type="button" disabled className={secondaryButtonClass}>
        Rejected
      </button>
    );
  }

  return undefined;
}


type OverviewProps = {
  document: DocumentDetailType;
};


type FilesSectionProps = {
  document: DocumentDetailType;
  assets: Asset[];
  primaryAsset: Asset | null;
  canUpload: boolean;
  canDelete: boolean;
  isActionLoading: boolean;
  onUploaded: () => Promise<void> | void;
  onDownload: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
};


function FilesSection({
  document,
  assets,
  primaryAsset,
  canUpload,
  canDelete,
  isActionLoading,
  onUploaded,
  onDownload,
  onDelete,
}: FilesSectionProps) {
  return (
    <div className="space-y-5">
      {isActionLoading && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
          Updating file records...
        </div>
      )}

      <PrimaryAssetCard asset={primaryAsset} onDownload={onDownload} />

      {canUpload ? (
        <AssetUploadPanel
          documentId={document.id}
          documentStatus={document.status}
          onUploaded={onUploaded}
        />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-950">Upload Review File</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This document is read-only for your role. Upload and draft file changes stay with document owners and admins.
          </p>
        </section>
      )}

      <SummaryCard
        title="File Versions"
        subtitle="MLR review uploads become the primary file. Supporting uploads remain visible for traceability."
      >
        <AssetVersionsTable
          assets={assets}
          canDelete={canDelete}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </SummaryCard>
    </div>
  );
}


type ReviewSectionProps = {
  document: DocumentDetailType;
  primaryAsset: Asset | null;
  reviews: Review[];
  isLoading: boolean;
  errorMessage: string | null;
  currentUserId?: number;
  currentUserRoleIds?: number[];
  isAdmin: boolean;
  onSubmitted: (response: SubmitReviewResponse) => Promise<void> | void;
};


function ReviewSection({
  document,
  primaryAsset,
  reviews,
  isLoading,
  errorMessage,
  currentUserId,
  currentUserRoleIds,
  isAdmin,
  onSubmitted,
}: ReviewSectionProps) {
  const latestReview = [...reviews].sort(
    (left, right) =>
      new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime(),
  )[0];
  const visibleReview =
    reviews.find((review) => review.status === "IN_PROGRESS") ?? latestReview ?? null;
  const tasks = visibleReview?.tasks ?? [];
  const canSubmitReview = isAdmin || document.owner_id === currentUserId;

  if (document.status === "DRAFT") {
    return (
      <EmptyState
        title="Complete metadata and upload a file, then mark ready for review."
        description="The MLR review workflow becomes available after this document is ready for review."
      />
    );
  }

  if (document.status === "READY_FOR_REVIEW") {
    return (
      <div className="space-y-5">
        {canSubmitReview ? (
          <SubmitReviewPanel
            documentId={document.id}
            documentStatus={document.status}
            hasPrimaryAsset={Boolean(primaryAsset)}
            onSubmitted={onSubmitted}
          />
        ) : (
          <EmptyState
            title="Ready for review"
            description="Only the document owner or an admin can submit this document for MLR review."
          />
        )}

        {isLoading && <LoadingState label="Loading review history..." />}
        {errorMessage && <ErrorState message={errorMessage} />}
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState label="Loading review details..." rows={3} />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} />;
  }

  if (!visibleReview) {
    return (
      <EmptyState
        title="No review record found"
        description="Review details will appear after this document is submitted to MLR review."
      />
    );
  }

  return (
    <div className="space-y-5">
      <ReviewOutcomeNotice documentStatus={document.status} />
      <ReviewSummaryCard review={visibleReview} />
      <ReviewTasksTable
        tasks={tasks}
        canOpenTask={(task) =>
          isAdmin ||
          task.assignee_id === currentUserId ||
          (task.assignee_id === null &&
            Boolean(task.required_role_id && currentUserRoleIds?.includes(task.required_role_id)))
        }
      />
    </div>
  );
}


type ReviewOutcomeNoticeProps = {
  documentStatus: DocumentStatus;
};


function ReviewOutcomeNotice({ documentStatus }: ReviewOutcomeNoticeProps) {
  const messages: Partial<Record<DocumentStatus, { title: string; body: string; className: string }>> = {
    IN_REVIEW: {
      title: "Review in progress",
      body: "Assigned reviewers can open their tasks and record decisions from the task dashboard.",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    },
    APPROVED: {
      title: "Approved",
      body: "All required MLR review tasks were approved for this review cycle.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    CHANGES_REQUESTED: {
      title: "Changes requested",
      body: "At least one reviewer requested changes. Review the task decisions before revising the document.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    REJECTED: {
      title: "Rejected",
      body: "At least one reviewer rejected the document in this review cycle.",
      className: "border-rose-200 bg-rose-50 text-rose-800",
    },
  };
  const message = messages[documentStatus];

  if (!message) {
    return null;
  }

  return (
    <div className={["rounded-lg border px-4 py-3 text-sm shadow-sm", message.className].join(" ")}>
      <p className="font-semibold">{message.title}</p>
      <p className="mt-1 leading-6">{message.body}</p>
    </div>
  );
}


function Overview({ document }: OverviewProps) {
  const { hasPermission } = useAuth();
  const canOpenRequests = canAccessRequests(hasPermission);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SummaryCard title="Document Metadata">
        <div className="space-y-5">
          <DetailBlock title="Description" value={document.description || "No description"} />
          <DetailBlock title="Intended Use" value={document.intended_use || "Not set"} />
          <DetailBlock title="Keywords" value={document.keywords || "Not set"} />
        </div>
      </SummaryCard>

      <SummaryCard title="Classification">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Brand" value={displayReference(document.brand?.name, document.brand_id)} />
          <DetailRow label="Product" value={displayReference(document.product?.name, document.product_id)} />
          <DetailRow label="Country" value={displayReference(document.country?.name, document.country_id)} />
          <DetailRow label="Language" value={displayReference(document.language?.name, document.language_id)} />
          <DetailRow
            label="Document Type"
            value={displayReference(document.document_type?.name, document.document_type_id)}
          />
          <DetailRow
            label="Document Subtype"
            value={displayReference(document.document_subtype?.name, document.document_subtype_id)}
          />
          <DetailRow
            label="Content Request"
            value={
              document.material_request && canOpenRequests ? (
                <Link to={`/requests/${document.material_request.id}`} className="text-brand-700 hover:text-brand-600">
                  {document.material_request.request_number} / {document.material_request.title}
                </Link>
              ) : document.material_request ? (
                `${document.material_request.request_number} / ${document.material_request.title}`
              ) : (
                "Not linked"
              )
            }
          />
        </dl>
      </SummaryCard>

      <SummaryCard title="Usage and Expiry">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Channel" value={displayReference(document.channel?.name, document.channel_id)} />
          <DetailRow label="Audience" value={displayReference(document.audience?.name, document.audience_id)} />
          <DetailRow label="Expiry Date" value={formatDate(document.expiry_date)} />
          <DetailRow label="Current Status" value={<StatusBadge status={document.status} />} />
        </dl>
      </SummaryCard>

      <SummaryCard title="Ownership">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Owner" value={document.owner?.full_name ?? `User ${document.owner_id}`} />
          <DetailRow label="Created By" value={document.created_by?.full_name ?? `User ${document.created_by_id}`} />
          <DetailRow label="Created" value={formatDateTime(document.created_at)} />
          <DetailRow label="Updated" value={formatDateTime(document.updated_at)} />
        </dl>
      </SummaryCard>
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

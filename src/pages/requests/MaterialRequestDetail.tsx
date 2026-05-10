import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import {
  finalApproveRequest,
  getApprovedMaterialHistory,
  getRequestApprovedMaterial,
  withdrawApprovedMaterial,
} from "../../api/approvedMaterials";
import { downloadAsset } from "../../api/assets";
import {
  completeTherapyAlignment,
  createContentRequestComment,
  listContentRequestComments,
  reopenContentRequestComment,
  resolveContentRequestComment,
} from "../../api/collaborationComments";
import { getRequestContentVersions } from "../../api/contentVersions";
import {
  getDesignJobHistory,
  getRequestDesignJobs,
  sendRequestToDesign,
  transitionDesignJob,
  uploadDesignJobFile,
} from "../../api/designJobs";
import { createContentWorkspaceDraftVersion } from "../../api/contentVersions";
import {
  getOrCreateContentVersionComplianceRecord,
  getRequestComplianceRecords,
  issueMlrCode,
  updateComplianceRecord,
} from "../../api/legalCompliance";
import {
  dismissReviewAnnotation,
  getRequestReviewAnnotations,
  reopenReviewAnnotation,
  resolveReviewAnnotation,
} from "../../api/reviewAnnotations";
import {
  acceptRegionalEdits,
  getMaterialRequest,
  getMaterialRequestDocuments,
  getMaterialRequestHistory,
  getContentRequestRevisionCycles,
  downloadContentRequestReferenceMaterial,
  approveRouteRegionalRequest,
  deferRegionalRequest,
  getContentRequestRegionalRoutingPreview,
  getMedicalRevisionContext,
  mergeRegionalRequest,
  rejectRegionalRequest,
  resubmitAfterRegionalEdits,
  resubmitMedicalReview,
  requestRegionalModification,
  returnToSpocWithRegionalEdits,
  createContentWorkspace,
  startMedicalRevision,
  startTherapyDraftCreation,
  startRegionalEvaluation,
  submitMedicalReview,
  submitMaterialRequest,
  submitMaterialRequestMlr,
  transitionMaterialRequest,
} from "../../api/materialRequests";
import { getDesignAgencies } from "../../api/masterData";
import { getUsers } from "../../api/users";
import { ContentVersionsSection } from "../../components/content-versions/ContentVersionsSection";
import { ApprovedMaterialPanel } from "../../components/requests/ApprovedMaterialPanel";
import { ReferenceMaterialViewer } from "../../components/requests/ReferenceMaterialViewer";
import { DesignBriefPanel } from "../../components/design-jobs/DesignBriefPanel";
import { DesignJobPanel } from "../../components/design-jobs/DesignJobPanel";
import { ComplianceRecordPanel } from "../../components/reviews/ComplianceRecordPanel";
import { ReviewAnnotationsPanel } from "../../components/reviews/ReviewAnnotationsPanel";
import { ContentViewer } from "../../components/viewer/ContentViewer";
import { BottomDrawer, type BottomDrawerTab } from "../../components/ui/BottomDrawer";
import { CurrentNextStepCard } from "../../components/ui/CurrentNextStepCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LifecycleTracker } from "../../components/ui/LifecycleTracker";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import type { WorkflowStep } from "../../components/ui/WorkflowStepper";
import { useAuth } from "../../context/AuthContext";
import { useActiveTabRefreshNonce, useWorkspaceTabs } from "../../context/WorkspaceTabsContext";
import { useMaterialRequestMasterData, type MaterialRequestMasterData } from "../../hooks/useMaterialRequestMasterData";
import type { ViewerAsset } from "../../types/asset";
import type {
  CollaborationTopicCode,
  CollaborationVisibility,
  ContentCollaborationComment,
  ContentCollaborationCommentCreatePayload,
  TherapyAlignmentCompletePayload,
} from "../../types/collaborationComment";
import type { ContentVersion } from "../../types/contentVersion";
import type { DesignJob, DesignJobHistory, DesignJobUploadPayload } from "../../types/designJob";
import type { DocumentListItem } from "../../types/document";
import type {
  LegalComplianceRecord,
  LegalComplianceRecordIssueCodePayload,
  LegalComplianceRecordUpdatePayload,
} from "../../types/legalCompliance";
import type { DesignAgency } from "../../types/masterData";
import type { ReviewAnnotation } from "../../types/reviewAnnotation";
import type {
  ApprovedMaterial,
  ApprovedMaterialHistory,
  FinalApprovalPayload,
} from "../../types/approvedMaterial";
import type {
  ContentRequestAvailableAction,
  ContentRequestPanelCode,
  ContentRequestRegionalAmendment,
  ContentRequestRegionalFieldChange,
  ContentRequestReferenceMaterial,
  ContentRequestRevisionCycle,
  ContentWorkspaceCurrentVersion,
  ContentWorkspaceSummary,
  MaterialRequest,
  MaterialRequestHistory,
  MaterialRequestStatus,
  MaterialRequestTransitionAction,
  MedicalRevisionContext,
  WorkflowTaskSummary,
} from "../../types/materialRequest";
import type { User as PlatformUser } from "../../types/user";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/fileSize";
import { PERMISSIONS } from "../../utils/permissions";


type LocationState = {
  successMessage?: string;
};


type LinkedDocument = DocumentListItem & {
  latestVersionNumber: number;
  latestMlrContentVersion?: ContentVersion | null;
};

type AnnotationViewFilter =
  | "OPEN_MANDATORY"
  | "OPEN_OPTIONAL"
  | "RESOLVED"
  | "DISMISSED"
  | "ALL";

type RegionalActionKind =
  | "start"
  | "approve-route"
  | "request-modification"
  | "return-with-edits"
  | "reject"
  | "defer"
  | "merge";

type RegionalActionPayload = {
  notes?: string | null;
  reason?: string;
  return_reason_code?: string;
  return_reason_label?: string | null;
  return_notes?: string;
  required_corrections?: string[];
  return_attachment_ids?: number[];
  edited_fields?: Record<string, unknown>;
  amendment_id?: string | null;
  defer_reason?: string;
  defer_until?: string;
  merged_into_request_id?: string;
};

type ActionOptions = {
  comment?: string | null;
  confirmMessage?: string;
  successMessage: string;
  spoc_response_notes?: string | null;
  spoc_attachment_ids?: number[];
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";

const revisionReasonOptions = [
  { value: "MISSING_BUSINESS_OBJECTIVE", label: "Missing Business Objective" },
  { value: "TARGET_AUDIENCE_UNCLEAR", label: "Target Audience Unclear" },
  { value: "LOCAL_REQUIREMENTS_UNCLEAR", label: "Local Requirements Unclear" },
  { value: "BUDGET_ISSUE", label: "Budget Issue" },
  { value: "DUPLICATE_CLARIFICATION_NEEDED", label: "Duplicate Clarification Needed" },
  { value: "REFERENCE_MATERIAL_MISSING", label: "Reference Material Missing" },
  { value: "REGULATORY_FEASIBILITY_CONCERN", label: "Regulatory Feasibility Concern" },
  { value: "OTHER", label: "Other" },
];

const requiredCorrectionOptions = [
  "Update request title/brief",
  "Clarify target audience",
  "Add local requirements",
  "Correct budget code",
  "Add or update reference material",
  "Clarify cross-country applicability",
  "Update in-market date",
  "Other",
];

type RegionalEditableFieldConfig = {
  key: string;
  label: string;
  group: "Request Summary" | "Audience & Channel" | "Messaging" | "Timeline & Budget" | "References";
  input: "text" | "date" | "textarea" | "select" | "multiselect";
  getValue: (request: MaterialRequest) => string;
  getOptions?: (masterData: MaterialRequestMasterData) => RegionalEditOption[];
};

type RegionalEditOption = {
  value: string;
  label: string;
};

const regionalEditableFields: RegionalEditableFieldConfig[] = [
  { key: "request_title", label: "Request Title", group: "Request Summary", input: "text", getValue: (request) => request.title ?? "" },
  { key: "brief_description", label: "Brief Description", group: "Request Summary", input: "textarea", getValue: (request) => request.description ?? "" },
  { key: "local_requirements", label: "Local Requirements", group: "Request Summary", input: "textarea", getValue: (request) => request.local_requirements ?? "" },
  {
    key: "target_audience_ids",
    label: "Target Audience",
    group: "Audience & Channel",
    input: "multiselect",
    getValue: (request) => (request.target_audience_ids ?? []).join(", "),
    getOptions: (masterData) => masterData.audiences.map(toRegionalEditOption),
  },
  { key: "hcp_specialty", label: "HCP Specialty", group: "Audience & Channel", input: "text", getValue: (request) => request.target_hcp_specialty ?? "" },
  {
    key: "channel_id",
    label: "Channel",
    group: "Audience & Channel",
    input: "select",
    getValue: (request) => request.channel_id?.toString() ?? "",
    getOptions: (masterData) => masterData.channels.map(toRegionalEditOption),
  },
  {
    key: "content_type_id",
    label: "Content Type",
    group: "Audience & Channel",
    input: "select",
    getValue: (request) => request.material_type_id?.toString() ?? "",
    getOptions: (masterData) => masterData.documentTypes.map(toRegionalEditOption),
  },
  {
    key: "additional_countries",
    label: "Additional Countries",
    group: "Audience & Channel",
    input: "multiselect",
    getValue: (request) => (request.additional_country_ids ?? []).join(", "),
    getOptions: (masterData) => masterData.countries.map(toRegionalEditOption),
  },
  {
    key: "campaign_id",
    label: "Campaign",
    group: "Audience & Channel",
    input: "select",
    getValue: (request) => request.campaign_id?.toString() ?? "",
    getOptions: (masterData) => masterData.campaigns.map(toRegionalEditOption),
  },
  { key: "business_objective", label: "Business Objective", group: "Messaging", input: "textarea", getValue: (request) => request.business_objective ?? "" },
  { key: "key_messages", label: "Key Messages", group: "Messaging", input: "textarea", getValue: (request) => request.key_messages ?? "" },
  { key: "priority", label: "Priority", group: "Timeline & Budget", input: "text", getValue: (request) => request.priority ?? "" },
  { key: "in_market_date", label: "In-market Date", group: "Timeline & Budget", input: "date", getValue: (request) => request.required_by_date ?? "" },
  { key: "budget_code", label: "Budget Code", group: "Timeline & Budget", input: "text", getValue: (request) => request.budget_code ?? "" },
  { key: "currency_code", label: "Currency Code", group: "Timeline & Budget", input: "text", getValue: (request) => request.currency_code ?? "" },
  { key: "reference_notes", label: "Reference Notes", group: "References", input: "textarea", getValue: (request) => request.reference_notes ?? "" },
];

const regionalEditableGroups: RegionalEditableFieldConfig["group"][] = [
  "Request Summary",
  "Audience & Channel",
  "Messaging",
  "Timeline & Budget",
  "References",
];

const therapyAlignmentStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const collaborationTopicOptions: Array<{ value: CollaborationTopicCode; label: string }> = [
  { value: "KEY_MESSAGES", label: "Key Messages" },
  { value: "POSITIONING", label: "Positioning" },
  { value: "TARGET_AUDIENCE", label: "Target Audience" },
  { value: "LOCAL_REQUIREMENTS", label: "Local Requirements" },
  { value: "REFERENCE_MATERIALS", label: "Reference Materials" },
  { value: "CLAIMS", label: "Claims" },
  { value: "OTHER", label: "Other" },
];

const collaborationVisibilityOptions: Array<{ value: CollaborationVisibility; label: string }> = [
  { value: "SHARED", label: "Shared" },
  { value: "INTERNAL_THERAPY", label: "Internal Therapy" },
  { value: "ADMIN_ONLY", label: "Admin Only" },
];

const therapyAlignmentChecklistItems = [
  { key: "key_messages_discussed", label: "Key messages discussed" },
  { key: "positioning_confirmed", label: "Positioning confirmed" },
  { key: "target_audience_confirmed", label: "Target audience confirmed" },
  { key: "local_requirements_reviewed", label: "Local requirements reviewed" },
  { key: "reference_materials_reviewed", label: "Reference materials reviewed" },
  { key: "regional_notes_acknowledged", label: "Regional notes acknowledged" },
];


const lifecycleSteps: Array<{ label: string; statuses: MaterialRequestStatus[] }> = [
  { label: "Content Request Intake", statuses: ["DRAFT", "RETURNED_TO_SPOC", "SPOC_REVISION_IN_PROGRESS"] },
  { label: "Regional Marketing Evaluation", statuses: ["SUBMITTED", "SUBMITTED_PENDING_REGIONAL_REVIEW", "RESUBMITTED", "RESUBMITTED_PENDING_REGIONAL_REVIEW", "UNDER_REGIONAL_REVIEW"] },
  { label: "Therapy Lead Draft Creation", statuses: ["APPROVED_ASSIGNED_TO_THERAPY_LEAD", "DRAFT_IN_PROGRESS", "DRAFT_VERSION_READY", "MEDICAL_REVISION_REQUIRED", "MEDICAL_REVISION_IN_PROGRESS"] },
  { label: "Medical Content Review", statuses: ["SUBMITTED_FOR_MEDICAL_REVIEW", "RESUBMITTED_FOR_MEDICAL_REVIEW", "MEDICAL_REVIEW_IN_PROGRESS", "THERAPY_REVIEW", "THERAPY_CHANGES_REQUESTED"] },
  { label: "Design Brief & Iterations", statuses: ["MEDICAL_CONTENT_APPROVED", "DESIGN_BRIEF_IN_PROGRESS", "DESIGN_BRIEF_SUBMITTED", "DESIGN_IN_PROGRESS", "DESIGN_DRAFT_UPLOADED", "DESIGN_REVIEW_IN_PROGRESS", "DESIGN_REVISION_REQUIRED", "DESIGN_REVISION_IN_PROGRESS", "DESIGN_APPROVED", "DESIGN_REVIEW"] },
  { label: "Proof Reading", statuses: ["MARKETING_REVIEW", "MARKETING_CHANGES_REQUESTED"] },
  { label: "Formal MLR Review", statuses: ["READY_FOR_MLR", "MLR_IN_REVIEW", "MLR_CHANGES_REQUESTED"] },
  { label: "Approval Code", statuses: ["MLR_APPROVED"] },
  { label: "Country Customization", statuses: [] },
  { label: "Regional Final Review", statuses: ["FINAL_APPROVAL", "FINAL_APPROVED"] },
  { label: "Published", statuses: ["DISTRIBUTED"] },
];

const medicalReviewNavigationStatuses: MaterialRequestStatus[] = [
  "SUBMITTED_FOR_MEDICAL_REVIEW",
  "RESUBMITTED_FOR_MEDICAL_REVIEW",
  "MEDICAL_REVIEW_IN_PROGRESS",
];

const medicalReviewPanelStatuses: MaterialRequestStatus[] = [
  ...medicalReviewNavigationStatuses,
  "MEDICAL_REVISION_REQUIRED",
  "MEDICAL_REVISION_IN_PROGRESS",
  "MEDICAL_CONTENT_APPROVED",
  "DESIGN_BRIEF_IN_PROGRESS",
  "DESIGN_BRIEF_SUBMITTED",
];

const designBriefPanelStatuses: MaterialRequestStatus[] = [
  "MEDICAL_CONTENT_APPROVED",
  "DESIGN_BRIEF_IN_PROGRESS",
  "DESIGN_BRIEF_SUBMITTED",
  "DESIGN_IN_PROGRESS",
  "DESIGN_DRAFT_UPLOADED",
  "DESIGN_REVIEW_IN_PROGRESS",
  "DESIGN_REVISION_REQUIRED",
  "DESIGN_REVISION_IN_PROGRESS",
  "DESIGN_APPROVED",
];

const formalMlrStatuses: MaterialRequestStatus[] = [
  "READY_FOR_MLR",
  "MLR_IN_REVIEW",
  "MLR_CHANGES_REQUESTED",
  "MLR_APPROVED",
];

const legacyDesignProductionStatuses: MaterialRequestStatus[] = [];

const finalApprovalPanelStatuses: MaterialRequestStatus[] = [
  "FINAL_APPROVAL",
  "FINAL_APPROVED",
  "DISTRIBUTED",
];

const distributionPanelStatuses: MaterialRequestStatus[] = [
  "FINAL_APPROVED",
  "DISTRIBUTED",
  "WITHDRAWN",
];

const statusesWithApprovedMaterialLookup: MaterialRequestStatus[] = [
  "FINAL_APPROVED",
  "DISTRIBUTED",
  "WITHDRAWN",
  "EXPIRED",
];

const annotationFilterButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-100";


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


function fallbackName(name: string | undefined | null, id: number | null): string {
  if (name) {
    return name;
  }

  return id ? `ID ${id}` : "Not set";
}


function toRegionalEditOption(item: { id: number; name: string; code?: string | null }): RegionalEditOption {
  return {
    value: String(item.id),
    label: item.code ? `${item.name} (${item.code})` : item.name,
  };
}


function addCurrentRegionalOption(
  options: RegionalEditOption[],
  item: { id?: number | null; name?: string | null; code?: string | null } | null | undefined,
): RegionalEditOption[] {
  if (!item?.id || !item.name) {
    return options;
  }
  const option = toRegionalEditOption({ id: item.id, name: item.name, code: item.code });
  if (options.some((candidate) => candidate.value === option.value)) {
    return options;
  }
  return [option, ...options];
}


function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => formatAuditValue(item)).join(", ") : "Not set";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}


function normalizeRegionalIdValues(value: unknown): string[] {
  if (value === null || value === undefined || value === "") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}


function regionalEditOptionsForField(
  fieldName: string,
  masterData: MaterialRequestMasterData,
  request?: MaterialRequest,
): RegionalEditOption[] {
  let options: RegionalEditOption[] = [];
  if (fieldName === "target_audience_ids" || fieldName === "target_audience_id") {
    options = masterData.audiences.map(toRegionalEditOption);
    return addCurrentRegionalOption(options, request?.target_audience);
  }
  if (fieldName === "channel_id") {
    options = masterData.channels.map(toRegionalEditOption);
    return addCurrentRegionalOption(options, request?.channel);
  }
  if (fieldName === "content_type_id" || fieldName === "material_type_id") {
    options = masterData.documentTypes.map(toRegionalEditOption);
    return addCurrentRegionalOption(options, request?.material_type);
  }
  if (fieldName === "additional_countries" || fieldName === "additional_country_ids") {
    return masterData.countries.map(toRegionalEditOption);
  }
  if (fieldName === "campaign_id") {
    options = masterData.campaigns.map(toRegionalEditOption);
    return addCurrentRegionalOption(options, request?.campaign);
  }
  return [];
}


function displayRegionalFieldValue(
  fieldName: string,
  value: unknown,
  masterData: MaterialRequestMasterData,
  request?: MaterialRequest,
): string {
  const options = regionalEditOptionsForField(fieldName, masterData, request);
  if (options.length === 0) {
    return formatAuditValue(value);
  }

  const ids = normalizeRegionalIdValues(value);
  if (ids.length === 0) {
    return "Not set";
  }

  return ids
    .map((id) => options.find((option) => option.value === id)?.label ?? `ID ${id}`)
    .join(", ");
}


function amendmentFieldChanges(amendment: ContentRequestRegionalAmendment | null | undefined): ContentRequestRegionalFieldChange[] {
  return amendment?.field_changes ?? amendment?.field_changes_json ?? [];
}


function findLifecycleIndex(status: MaterialRequestStatus): number {
  const index = lifecycleSteps.findIndex((step) => step.statuses.includes(status));
  return index >= 0 ? index : 0;
}


function getProgressStatus(request: MaterialRequest, history: MaterialRequestHistory[]): MaterialRequestStatus {
  if (["REJECTED", "WITHDRAWN", "DEFERRED", "MERGED", "CLOSED"].includes(request.status)) {
    const latestTerminalTransition = [...history]
      .reverse()
      .find((entry) => ["REJECTED", "WITHDRAWN", "DEFERRED", "MERGED", "CLOSED"].includes(entry.to_status));
    return latestTerminalTransition?.from_status ?? "DRAFT";
  }

  if (request.status === "EXPIRED") {
    const latestExpiredTransition = [...history]
      .reverse()
      .find((entry) => entry.to_status === "EXPIRED");
    return latestExpiredTransition?.from_status ?? "FINAL_APPROVED";
  }

  return request.status;
}


function getLifecycleSteps(
  request: MaterialRequest,
  history: MaterialRequestHistory[],
): WorkflowStep[] {
  const progressStatus = getProgressStatus(request, history);
  const currentIndex = findLifecycleIndex(progressStatus);
  const isFailed = request.status === "REJECTED" || request.status === "WITHDRAWN";

  return lifecycleSteps.map((step, index) => {
    let status: WorkflowStep["status"] = "pending";
    if (index < currentIndex) {
      status = "completed";
    }
    if (index === currentIndex) {
      status = isFailed ? "failed" : "current";
    }
    if (request.status === "MLR_CHANGES_REQUESTED" && step.label === "MLR Review") {
      status = "failed";
    }
    if (request.status === "DISTRIBUTED") {
      status = "completed";
    }

    const isFuturePhase = index >= 3 && status === "pending";
    let helperText =
      request.status === "MLR_CHANGES_REQUESTED" && step.label === "MLR Review"
        ? "Changes requested"
        : isFuturePhase
          ? "Coming later"
          : undefined;
    if (progressStatus === "MEDICAL_CONTENT_APPROVED" && step.label === "Medical Content Review" && status === "completed") {
      helperText = "Medical Content Review complete";
    }
    if (step.label === "Design Brief & Iterations" && status === "current") {
      if (progressStatus === "MEDICAL_CONTENT_APPROVED") {
        helperText = "Design stage ready";
      } else if (progressStatus === "DESIGN_BRIEF_IN_PROGRESS") {
        helperText = "Design stage active: Brief Creation";
      } else if (progressStatus === "DESIGN_BRIEF_SUBMITTED") {
        helperText = "Design stage active: Waiting for Designer";
      } else if (progressStatus === "DESIGN_IN_PROGRESS") {
        helperText = "Design stage active: Draft Production";
      } else if (progressStatus === "DESIGN_DRAFT_UPLOADED") {
        helperText = "Draft uploaded / waiting for Therapy Lead review";
      } else if (progressStatus === "DESIGN_REVIEW_IN_PROGRESS") {
        helperText = "Therapy Lead reviewing";
      } else if (progressStatus === "DESIGN_REVISION_REQUIRED") {
        helperText = "Revision requested";
      } else if (progressStatus === "DESIGN_REVISION_IN_PROGRESS") {
        helperText = "Designer revising";
      } else if (progressStatus === "DESIGN_APPROVED") {
        helperText = "Completed";
      }
    }
    if (step.label === "Proof Reading" && status === "pending") {
      helperText = "Coming later";
    }
    return {
      label: step.label,
      status,
      helperText,
    };
  });
}


function isTerminal(status: MaterialRequestStatus): boolean {
  return ["DISTRIBUTED", "REJECTED", "WITHDRAWN", "EXPIRED", "DEFERRED", "MERGED", "CLOSED"].includes(status);
}


const therapyAlignmentHardHiddenStatuses: MaterialRequestStatus[] = [
  "DRAFT",
  "SUBMITTED_PENDING_REGIONAL_REVIEW",
  "RESUBMITTED_PENDING_REGIONAL_REVIEW",
  "UNDER_REGIONAL_REVIEW",
  "RETURNED_TO_SPOC",
  "SPOC_REVISION_IN_PROGRESS",
  "DEFERRED",
  "MERGED",
  "REJECTED",
];


const regionalStageStatuses: MaterialRequestStatus[] = [
  "SUBMITTED",
  "SUBMITTED_PENDING_REGIONAL_REVIEW",
  "RESUBMITTED",
  "RESUBMITTED_PENDING_REGIONAL_REVIEW",
  "UNDER_REGIONAL_REVIEW",
];


const therapyStageStatuses: MaterialRequestStatus[] = [
  "APPROVED_ASSIGNED_TO_THERAPY_LEAD",
  "DRAFT_IN_PROGRESS",
  "DRAFT_VERSION_READY",
  "SUBMITTED_FOR_MEDICAL_REVIEW",
  "MEDICAL_REVIEW_IN_PROGRESS",
  "MEDICAL_REVISION_REQUIRED",
  "MEDICAL_REVISION_IN_PROGRESS",
  "RESUBMITTED_FOR_MEDICAL_REVIEW",
  "MEDICAL_CONTENT_APPROVED",
  "DESIGN_BRIEF_IN_PROGRESS",
  "DESIGN_BRIEF_SUBMITTED",
];


function canShowRequestPanel(request: MaterialRequest, panelCode: ContentRequestPanelCode): boolean {
  if (request.ui_visibility?.visible_panels) {
    return request.ui_visibility.visible_panels.includes(panelCode);
  }

  if (panelCode === "THERAPY_ALIGNMENT" && therapyAlignmentHardHiddenStatuses.includes(request.status)) {
    return false;
  }
  if (panelCode === "REGIONAL_EVALUATION") {
    return regionalStageStatuses.includes(request.status) || Boolean(request.regional_evaluation_notes || request.regional_decision_reason);
  }
  if (["CONTENT_WORKSPACE", "DRAFT_VERSIONS", "AUTHORING_STUDIO"].includes(panelCode)) {
    return therapyStageStatuses.includes(request.status);
  }
  if (panelCode === "MEDICAL_REVIEW") {
    return medicalReviewPanelStatuses.includes(request.status);
  }
  if (panelCode === "DESIGN_BRIEF") {
    return designBriefPanelStatuses.includes(request.status);
  }
  if (panelCode === "FORMAL_MLR") {
    return formalMlrStatuses.includes(request.status);
  }
  return true;
}


function hasRequestAction(request: MaterialRequest | null, action: ContentRequestAvailableAction): boolean {
  if (!request?.ui_visibility?.available_actions) {
    return true;
  }
  return request.ui_visibility.available_actions.includes(action);
}


function getCurrentNextStep(request: MaterialRequest): { title: string; description: string } {
  const status = request.status;
  if (["DRAFT_IN_PROGRESS", "DRAFT_VERSION_READY"].includes(status) && request.has_content_workspace) {
    if (request.current_draft_version || (request.draft_versions_count ?? 0) > 0) {
      const alignmentCompleted =
        request.medical_submission_readiness?.therapy_alignment_completed ??
        request.therapy_alignment_status === "COMPLETED";
      if (!alignmentCompleted) {
        return {
          title: "Complete Therapy Alignment",
          description: "Complete Therapy Alignment before submitting to Medical Review.",
        };
      }
      return {
        title: "Submit to Medical Review",
        description: "Submit the current Therapy Lead draft version to Medical Content Review.",
      };
    }

    return {
      title: "Create draft version",
      description: "Create the first Therapy Lead draft version for the linked content dashboard.",
    };
  }

  const nextSteps: Partial<Record<MaterialRequestStatus, { title: string; description: string }>> = {
    DRAFT: {
      title: "Submit request",
      description: "Review the intake details, then submit the request to start the lifecycle.",
    },
    SUBMITTED: {
      title: "Regional evaluation pending",
      description: "Regional Marketing should start the evaluation and decide how to route the request.",
    },
    SUBMITTED_PENDING_REGIONAL_REVIEW: {
      title: "Start regional evaluation",
      description: "Regional Marketing should assess strategy, duplication, resources, budget, countries, and feasibility.",
    },
    UNDER_REGIONAL_REVIEW: {
      title: "Complete regional evaluation",
      description: "Regional Marketing can approve-route, return edits to SPOC, request modification, reject, defer, or merge.",
    },
    RETURNED_TO_SPOC: {
      title: "Verify regional edits",
      description: "The Country SPOC should review proposed changes, save any revisions, then resubmit to Regional Marketing.",
    },
    SPOC_REVISION_IN_PROGRESS: {
      title: "Verify and resubmit",
      description: "The Country SPOC is reviewing returned edits before resubmitting to Regional Marketing.",
    },
    RESUBMITTED: {
      title: "Regional evaluation pending",
      description: "Regional Marketing should continue evaluation of the resubmitted request.",
    },
    RESUBMITTED_PENDING_REGIONAL_REVIEW: {
      title: "Regional evaluation pending",
      description: "Regional Marketing should review the SPOC resubmission.",
    },
    APPROVED_ASSIGNED_TO_THERAPY_LEAD: {
      title: "Start draft creation",
      description: "The assigned Therapy Lead should review the approved request package and start content draft creation.",
    },
    DRAFT_IN_PROGRESS: {
      title: "Create content dashboard",
      description: "Therapy Lead draft creation has started. Create the linked dashboard for future drafts, files, reviews, and approvals.",
    },
    DRAFT_VERSION_READY: {
      title: "Submit to Medical Review",
      description: "Therapy Alignment is complete. Submit the current draft version to Medical Content Review.",
    },
    SUBMITTED_FOR_MEDICAL_REVIEW: {
      title: "Medical Content Review",
      description: "A Medical Content Review task is open for the submitted draft version.",
    },
    MEDICAL_REVIEW_IN_PROGRESS: {
      title: "Medical Content Review in progress",
      description: "The Medical Reviewer is reviewing the submitted draft version.",
    },
    MEDICAL_REVISION_REQUIRED: {
      title: "Start Medical Revision",
      description: "The assigned Therapy Lead should review Medical feedback and start the revision task.",
    },
    MEDICAL_REVISION_IN_PROGRESS: {
      title: request.current_draft_version?.status === "DRAFT" ? "Resubmit to Medical Review" : "Create revised draft version",
      description: request.current_draft_version?.status === "DRAFT"
        ? "Resubmit the revised draft version to Medical Content Review."
        : "Create a revised draft version that addresses Medical feedback.",
    },
    RESUBMITTED_FOR_MEDICAL_REVIEW: {
      title: "Medical Content Review",
      description: "The revised draft was resubmitted and is waiting for Medical Review.",
    },
    MEDICAL_CONTENT_APPROVED: {
      title: "Create Design Brief",
      description: "Medical Content Review is complete. Design Brief creation is the next workflow step.",
    },
    DESIGN_BRIEF_IN_PROGRESS: {
      title: "Complete and Submit Design Brief",
      description: "The Therapy Lead should finish the design instructions and assign Design ownership.",
    },
    DESIGN_BRIEF_SUBMITTED: {
      title: "Waiting for Design Production",
      description: "The submitted design brief is waiting for the assigned Designer or Design Group.",
    },
    DEFERRED: {
      title: "Request deferred",
      description: "No active work is currently required while this request is deferred.",
    },
    MERGED: {
      title: "Request merged",
      description: "This request has been linked into another content request.",
    },
    CLOSED: {
      title: "Request closed",
      description: "No further request actions are available.",
    },
    THERAPY_REVIEW: {
      title: "Complete therapy review",
      description: "The therapy reviewer should approve, request changes, or reject this request.",
    },
    THERAPY_CHANGES_REQUESTED: {
      title: "Revise and resubmit",
      description: "The requester should address therapy feedback and resubmit the request.",
    },
    MARKETING_REVIEW: {
      title: "Complete marketing review",
      description: "The marketing reviewer should approve the request as ready for MLR or request changes.",
    },
    MARKETING_CHANGES_REQUESTED: {
      title: "Revise and resubmit",
      description: "The requester should address marketing feedback and resubmit the request.",
    },
    READY_FOR_MLR: {
      title: "Add review content and submit MLR",
      description: "Add review content, upload the MLR review file, mark it ready, then submit MLR.",
    },
    MLR_IN_REVIEW: {
      title: "Reviewer tasks are in progress",
      description: "Medical, legal, and regulatory reviewers should complete their assigned review tasks.",
    },
    MLR_CHANGES_REQUESTED: {
      title: "Resolve MLR changes",
      description: "Update review content, resolve mandatory comments, and resubmit MLR.",
    },
    MLR_APPROVED: {
      title: "Complete compliance checklist and issue MLR code",
      description: "Complete compliance checks, issue the MLR code, then send the material to design.",
    },
    DESIGN_IN_PROGRESS: {
      title: "Upload design draft",
      description: "Designer is preparing the design draft.",
    },
    DESIGN_DRAFT_UPLOADED: {
      title: "Review Design Draft V1",
      description: "Therapy Lead should review the uploaded design draft.",
    },
    DESIGN_REVIEW_IN_PROGRESS: {
      title: "Complete Design Review",
      description: "Therapy Lead should approve the design or request a revision.",
    },
    DESIGN_APPROVED: {
      title: "Start Proof Reading",
      description: "Proof-reading will be available in the next step.",
    },
    DESIGN_REVISION_REQUIRED: {
      title: "Revise Design Draft",
      description: "Designer should review the requested changes. Revised upload arrives in Step 5D.",
    },
    DESIGN_REVISION_IN_PROGRESS: {
      title: "Upload Revised Design Draft",
      description: "Designer is working on the requested changes and preparing the next draft.",
    },
    DESIGN_REVIEW: {
      title: "Review design draft",
      description: "Approve the design to move to final approval or request a revision.",
    },
    FINAL_APPROVAL: {
      title: "Grant final approval",
      description: "A final approver can grant final approval and create the approved material record.",
    },
    FINAL_APPROVED: {
      title: "Add to distribution package",
      description: "A publisher can add the approved material to a distribution package and release it.",
    },
    DISTRIBUTED: {
      title: "Sales access is available",
      description: "Sales reps can access released material from Sales Materials.",
    },
    REJECTED: {
      title: "Request rejected",
      description: "No further lifecycle action is available for this rejected request.",
    },
    WITHDRAWN: {
      title: "Request withdrawn",
      description: "No further lifecycle action is available for this withdrawn request.",
    },
    EXPIRED: {
      title: "Request expired",
      description: "No further lifecycle action is available for this expired request.",
    },
  };

  return nextSteps[status] ?? {
    title: "Review current state",
    description: "Check the available actions and history for the next lifecycle move.",
  };
}


function getCurrentOwnerLabel(request: MaterialRequest): string {
  if (request.current_owner_label) {
    return request.current_owner_label;
  }

  const ownerMap: Partial<Record<MaterialRequestStatus, string>> = {
    DRAFT: request.requested_by?.full_name ?? "Requester",
    SUBMITTED: "Regional Marketing",
    SUBMITTED_PENDING_REGIONAL_REVIEW: "Regional Marketing",
    UNDER_REGIONAL_REVIEW: "Regional Marketing",
    RETURNED_TO_SPOC: request.requested_by?.full_name ?? "Country SPOC",
    SPOC_REVISION_IN_PROGRESS: request.requested_by?.full_name ?? "Country SPOC",
    RESUBMITTED: "Regional Marketing",
    RESUBMITTED_PENDING_REGIONAL_REVIEW: "Regional Marketing",
    APPROVED_ASSIGNED_TO_THERAPY_LEAD: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    DRAFT_IN_PROGRESS: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    DRAFT_VERSION_READY: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    SUBMITTED_FOR_MEDICAL_REVIEW: "Medical Reviewer",
    MEDICAL_REVIEW_IN_PROGRESS: "Medical Reviewer",
    MEDICAL_REVISION_REQUIRED: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    MEDICAL_REVISION_IN_PROGRESS: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    RESUBMITTED_FOR_MEDICAL_REVIEW: "Medical Reviewer",
    MEDICAL_CONTENT_APPROVED: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    DESIGN_BRIEF_IN_PROGRESS: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    DESIGN_BRIEF_SUBMITTED: "Design",
    DEFERRED: "Regional Marketing",
    MERGED: "Closed",
    CLOSED: "Closed",
    THERAPY_REVIEW: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    THERAPY_CHANGES_REQUESTED: request.requested_by?.full_name ?? "Requester",
    MARKETING_REVIEW: request.assigned_marketing_manager?.full_name ?? "Marketing Manager",
    MARKETING_CHANGES_REQUESTED: request.requested_by?.full_name ?? "Requester",
    READY_FOR_MLR: request.requested_by?.full_name ?? "Request Creator",
    MLR_IN_REVIEW: "MLR Reviewers",
    MLR_CHANGES_REQUESTED: request.requested_by?.full_name ?? "Request Creator",
    MLR_APPROVED: "Compliance",
    DESIGN_IN_PROGRESS: "Design",
    DESIGN_DRAFT_UPLOADED: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    DESIGN_REVIEW_IN_PROGRESS: request.assigned_therapy_lead?.full_name ?? "Therapy Lead",
    DESIGN_APPROVED: "Proof Reader",
    DESIGN_REVISION_REQUIRED: "Design",
    DESIGN_REVISION_IN_PROGRESS: "Design",
    DESIGN_REVIEW: "Design Approver",
    FINAL_APPROVAL: "Final Approver",
    FINAL_APPROVED: "Publisher",
    DISTRIBUTED: "Sales",
  };

  return ownerMap[request.status] ?? "Closed";
}


function getRevisionStageLabel(stageCode: string): string {
  const labels: Record<string, string> = {
    REGIONAL_MARKETING_EVALUATION: "Regional Marketing Evaluation",
    MEDICAL_CONTENT_REVIEW: "Medical Content Review",
    FORMAL_MLR_REVIEW: "Formal MLR Review",
    DESIGN_REVIEW: "Design Review",
    REGIONAL_FINAL_REVIEW: "Regional Final Review",
  };
  return labels[stageCode] ?? stageCode.split("_").join(" ");
}


function getActivityActionLabel(action: string): string {
  const labels: Record<string, string> = {
    REQUEST_MODIFICATION: "Returned to SPOC",
    REGIONAL_EDITS_RETURNED_TO_SPOC: "Regional Edits Returned to SPOC",
    SPOC_ACCEPTED_REGIONAL_EDITS: "SPOC Accepted Regional Edits",
    SPOC_SAVED_RETURNED_DRAFT: "SPOC Saved Returned Draft",
    SPOC_RESUBMITTED_AFTER_REGIONAL_EDITS: "SPOC Resubmitted After Regional Edits",
    DRAFT_CREATED: "Draft Created",
    DRAFT_UPDATED: "Draft Updated",
    REQUEST_SUBMITTED: "Draft Submitted",
    REQUEST_RESUBMITTED: "Request Resubmitted",
    RESUBMIT_AFTER_MODIFICATION: "Resubmitted to Regional Marketing",
    regional_start: "Regional Evaluation Started",
    regional_approve_route: "Regional Approved And Routed",
    THERAPY_DRAFT_STARTED: "Therapy Draft Started",
    CONTENT_WORKSPACE_CREATED: "Content Dashboard Created",
    DRAFT_VERSION_CREATED: "Draft Version Created",
    THERAPY_ALIGNMENT_DECISION_NOTE_ADDED: "Therapy Alignment Decision Note Added",
    THERAPY_ALIGNMENT_COMPLETED: "Therapy Alignment Completed",
    SUBMITTED_TO_MEDICAL_REVIEW: "Submitted To Medical Review",
    MEDICAL_CONTENT_APPROVED: "Medical Content Approved",
    MEDICAL_REVISION_REQUESTED: "Medical Revision Requested",
    THERAPY_MEDICAL_REVISION_STARTED: "Therapy Medical Revision Started",
    MEDICAL_REVISION_DRAFT_VERSION_CREATED: "Medical Revision Draft Version Created",
    RESUBMITTED_TO_MEDICAL_REVIEW: "Resubmitted To Medical Review",
    DESIGN_BRIEF_CREATED: "Design Brief Created",
    DESIGN_BRIEF_UPDATED: "Design Brief Updated",
    DESIGN_BRIEF_SUBMITTED: "Design Brief Submitted",
    DESIGN_WORK_STARTED: "Design Work Started",
    DESIGN_DRAFT_UPLOADED: "Design Draft Uploaded",
    DESIGN_REVIEW_IN_PROGRESS: "Design Review Started",
    DESIGN_DRAFT_APPROVED: "Design Draft Approved",
    DESIGN_APPROVED: "Design Approved",
    DESIGN_REVISION_REQUIRED: "Design Revision Required",
    DESIGN_REVISION_IN_PROGRESS: "Design Revision In Progress",
    DESIGN_REVIEW_STARTED: "Design Review Started",
    DESIGN_REVISION_REQUESTED: "Design Revision Requested",
    submit: "Request Submitted",
    resubmit: "Request Resubmitted",
  };
  return labels[action] ?? action.split("_").join(" ");
}


function getLatestMlrContentVersion(
  documentId: number,
  contentVersions: ContentVersion[],
): ContentVersion | null {
  const candidates = contentVersions.filter(
    (version) =>
      version.document_id === documentId &&
      version.asset?.asset_type === "MLR_REVIEW_FILE",
  );

  return [...candidates].sort((left, right) => {
    if (left.is_current !== right.is_current) {
      return left.is_current ? -1 : 1;
    }

    if (left.version_number !== right.version_number) {
      return right.version_number - left.version_number;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  })[0] ?? null;
}


function getPreferredRequestComplianceContentVersion(versions: ContentVersion[]): ContentVersion | null {
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


function isForbiddenError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}


function optionalSectionErrorMessage(error: unknown, forbiddenMessage: string): string {
  return isForbiddenError(error) ? forbiddenMessage : getApiErrorMessage(error);
}


export function MaterialRequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const refreshNonce = useActiveTabRefreshNonce();
  const { updateActiveTab } = useWorkspaceTabs();
  const requestMasterData = useMaterialRequestMasterData();
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [history, setHistory] = useState<MaterialRequestHistory[]>([]);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);
  const [revisionCycles, setRevisionCycles] = useState<ContentRequestRevisionCycle[]>([]);
  const [revisionCyclesErrorMessage, setRevisionCyclesErrorMessage] = useState<string | null>(null);
  const [medicalRevisionContext, setMedicalRevisionContext] = useState<MedicalRevisionContext | null>(null);
  const [medicalRevisionContextErrorMessage, setMedicalRevisionContextErrorMessage] = useState<string | null>(null);
  const [alignmentComments, setAlignmentComments] = useState<ContentCollaborationComment[]>([]);
  const [alignmentErrorMessage, setAlignmentErrorMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LinkedDocument[]>([]);
  const [linkedDocumentsErrorMessage, setLinkedDocumentsErrorMessage] = useState<string | null>(null);
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [contentVersionsErrorMessage, setContentVersionsErrorMessage] = useState<string | null>(null);
  const [designJobs, setDesignJobs] = useState<DesignJob[]>([]);
  const [designHistory, setDesignHistory] = useState<DesignJobHistory[]>([]);
  const [designAgencies, setDesignAgencies] = useState<DesignAgency[]>([]);
  const [availableUsers, setAvailableUsers] = useState<PlatformUser[]>([]);
  const [reviewAnnotations, setReviewAnnotations] = useState<ReviewAnnotation[]>([]);
  const [selectedReferenceMaterial, setSelectedReferenceMaterial] = useState<ContentRequestReferenceMaterial | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [complianceRecords, setComplianceRecords] = useState<LegalComplianceRecord[]>([]);
  const [approvedMaterial, setApprovedMaterial] = useState<ApprovedMaterial | null>(null);
  const [approvedMaterialHistory, setApprovedMaterialHistory] = useState<ApprovedMaterialHistory[]>([]);
  const [approvedMaterialErrorMessage, setApprovedMaterialErrorMessage] = useState<string | null>(null);
  const [approvedMaterialHistoryErrorMessage, setApprovedMaterialHistoryErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnotationLoading, setIsAnnotationLoading] = useState(false);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDesignActionLoading, setIsDesignActionLoading] = useState(false);
  const [isFinalApprovalSubmitting, setIsFinalApprovalSubmitting] = useState(false);
  const [isAlignmentActionLoading, setIsAlignmentActionLoading] = useState(false);
  const [isSendToDesignOpen, setIsSendToDesignOpen] = useState(false);
  const [isFinalApprovalOpen, setIsFinalApprovalOpen] = useState(false);
  const [isDraftVersionModalOpen, setIsDraftVersionModalOpen] = useState(false);
  const [isMedicalRevisionResubmitModalOpen, setIsMedicalRevisionResubmitModalOpen] = useState(false);
  const [isSendToDesignOptionsLoading, setIsSendToDesignOptionsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [designErrorMessage, setDesignErrorMessage] = useState<string | null>(null);
  const [annotationErrorMessage, setAnnotationErrorMessage] = useState<string | null>(null);
  const [complianceErrorMessage, setComplianceErrorMessage] = useState<string | null>(null);
  const [finalApprovalErrorMessage, setFinalApprovalErrorMessage] = useState<string | null>(null);
  const [draftVersionErrorMessage, setDraftVersionErrorMessage] = useState<string | null>(null);
  const [annotationFilter, setAnnotationFilter] = useState<AnnotationViewFilter>("OPEN_MANDATORY");
  const [sendToDesignForm, setSendToDesignForm] = useState({
    source_document_id: "",
    source_content_version_id: "",
    agency_id: "",
    assigned_designer_id: "",
    design_coordinator_id: "",
    brief: "",
    design_notes: "",
    due_date: "",
  });
  const [finalApprovalForm, setFinalApprovalForm] = useState({
    final_content_version_id: "",
    compliance_record_id: "",
    material_title: "",
    valid_from: "",
    valid_until: "",
    digital_asset_id: "",
    print_ready_asset_id: "",
    comment: "",
  });
  const [draftVersionForm, setDraftVersionForm] = useState({
    version_label: "Draft V1",
    draft_notes: "",
    change_summary: "Initial Therapy Lead draft created from approved content request.",
  });
  const [draftVersionFile, setDraftVersionFile] = useState<File | null>(null);
  const [isMedicalSubmitModalOpen, setIsMedicalSubmitModalOpen] = useState(false);
  const [medicalSubmitNotes, setMedicalSubmitNotes] = useState("");
  const [medicalSubmitErrorMessage, setMedicalSubmitErrorMessage] = useState<string | null>(null);
  const [medicalRevisionResubmitNotes, setMedicalRevisionResubmitNotes] = useState("");
  const [medicalRevisionAddressedSummary, setMedicalRevisionAddressedSummary] = useState("");
  const [medicalRevisionResubmitErrorMessage, setMedicalRevisionResubmitErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    const state = location.state as LocationState | null;
    return state?.successMessage ?? null;
  });

  const isAdmin = hasPermission(PERMISSIONS.MANAGE_SYSTEM);
  const isRequester = Boolean(request && user?.id === request.requested_by_id);
  const isAssignedTherapyLead = Boolean(
    request &&
      user?.id &&
      (user.id === request.assigned_therapy_lead_id ||
        user.id === request.therapy_lead_draft_task?.assigned_user_id ||
        user.id === request.therapy_medical_revision_task?.assigned_user_id),
  );
  const currentUserGroupIds = useMemo(() => {
    const groupIds = new Set<number>();
    (user?.user_group_ids ?? []).forEach((groupId) => groupIds.add(groupId));
    (user?.groups ?? []).forEach((group) => groupIds.add(group.id));
    return groupIds;
  }, [user]);
  const canShowPanel = useCallback(
    (panelCode: ContentRequestPanelCode) => (request ? canShowRequestPanel(request, panelCode) : false),
    [request],
  );
  const canUseAction = useCallback(
    (action: ContentRequestAvailableAction) => hasRequestAction(request, action),
    [request],
  );
  const primaryContentWorkspace = request?.primary_content_workspace ?? request?.linked_content_workspaces?.[0] ?? null;
  const canViewAudit = hasPermission(PERMISSIONS.VIEW_AUDIT);
  const canRegionalEvaluate =
    canUseAction("START_REGIONAL_EVALUATION") && (isAdmin || hasPermission(PERMISSIONS.REGIONAL_EVALUATE_REQUEST));
  const canRequestModification =
    canUseAction("REQUEST_MODIFICATION") && (isAdmin || hasPermission(PERMISSIONS.REQUEST_MODIFICATION));
  const canRejectRegional = canUseAction("REJECT") && (isAdmin || hasPermission(PERMISSIONS.REJECT_REQUEST));
  const canDeferRegional = canUseAction("DEFER") && (isAdmin || hasPermission(PERMISSIONS.DEFER_REQUEST));
  const canMergeRegional = canUseAction("MERGE") && (isAdmin || hasPermission(PERMISSIONS.MERGE_REQUEST));
  const canApproveRouteRegional =
    canUseAction("APPROVE_AND_ROUTE") && (isAdmin || hasPermission(PERMISSIONS.ASSIGN_THERAPY_LEAD));
  const canRegionalEdit = Boolean(
    request &&
      (request.can_regional_edit ??
        (canUseAction("REGIONAL_EDIT_REQUEST") &&
          (isAdmin || hasPermission(PERMISSIONS.REGIONAL_EDIT_CONTENT_REQUEST)))),
  );
  const canReturnWithRegionalEdits = Boolean(
    request &&
      (request.can_return_with_regional_edits ??
        (canUseAction("RETURN_TO_SPOC_WITH_EDITS") &&
          (isAdmin || hasPermission(PERMISSIONS.REGIONAL_EDIT_CONTENT_REQUEST)))),
  );
  const canSpocAcceptRegionalEdits = Boolean(
    request &&
      (request.can_spoc_accept_regional_edits ??
        (canUseAction("ACCEPT_REGIONAL_EDITS") && (isAdmin || isRequester))),
  );
  const canSpocResubmitAfterRegionalEdits = Boolean(
    request &&
      (request.can_spoc_resubmit_after_regional_edits ??
        (canUseAction("RESUBMIT_TO_REGIONAL") && (isAdmin || isRequester))),
  );
  const canStartTherapyDraft = Boolean(
    request &&
      canUseAction("START_THERAPY_DRAFT_CREATION") &&
      (isAssignedTherapyLead || isAdmin || hasPermission(PERMISSIONS.MANAGE_WORKFLOW)),
  );
  const canCreateContentWorkspace = Boolean(
    request &&
      canUseAction("CREATE_CONTENT_WORKSPACE") &&
      request.status === "DRAFT_IN_PROGRESS" &&
      !request.has_content_workspace &&
      (isAssignedTherapyLead ||
        isAdmin ||
        hasPermission(PERMISSIONS.MANAGE_WORKFLOW) ||
        hasPermission(PERMISSIONS.MANAGE_CONTENT_VERSIONS)),
  );
  const canCreateDraftVersion = Boolean(
    request &&
      canUseAction("CREATE_DRAFT_VERSION") &&
      primaryContentWorkspace &&
      ["DRAFT_IN_PROGRESS", "MEDICAL_REVISION_IN_PROGRESS"].includes(request.status) &&
      (isAssignedTherapyLead || isAdmin) &&
      (isAdmin ||
        hasPermission(PERMISSIONS.MANAGE_CONTENT_VERSIONS) ||
        hasPermission(PERMISSIONS.CREATE_CONTENT_DRAFT) ||
        hasPermission(PERMISSIONS.AUTHOR_CONTENT)),
  );
  const canStartMedicalRevision = Boolean(
    request &&
      canUseAction("START_MEDICAL_REVISION") &&
      (medicalRevisionContext?.can_start_revision ?? false) &&
      (isAssignedTherapyLead || isAdmin),
  );
  const canResubmitMedicalReview = Boolean(
    request &&
      canUseAction("RESUBMIT_TO_MEDICAL_REVIEW") &&
      (medicalRevisionContext?.can_resubmit_medical_review ?? false) &&
      (isAssignedTherapyLead || isAdmin) &&
      (isAdmin || hasPermission(PERMISSIONS.SUBMIT_MEDICAL_REVIEW)),
  );
  const canCommentOnContentRequest = Boolean(
    request &&
      canUseAction("ADD_THERAPY_ALIGNMENT_COMMENT") &&
      canShowPanel("THERAPY_ALIGNMENT") &&
      (isAdmin ||
        isRequester ||
        isAssignedTherapyLead ||
        hasPermission(PERMISSIONS.COMMENT_ON_CONTENT_REQUEST)),
  );
  const canUseInternalTherapyComments = Boolean(request && (isAdmin || isAssignedTherapyLead));
  const canUseAdminOnlyComments = isAdmin;
  const canCompleteTherapyAlignment = Boolean(
    request &&
      canUseAction("COMPLETE_THERAPY_ALIGNMENT") &&
      canShowPanel("THERAPY_ALIGNMENT") &&
      request.status === "DRAFT_IN_PROGRESS" &&
      Boolean(request.current_draft_version || (request.draft_versions_count ?? 0) > 0) &&
      request.therapy_alignment_status !== "COMPLETED" &&
      (isAdmin ||
        (isAssignedTherapyLead &&
          (hasPermission(PERMISSIONS.COMPLETE_THERAPY_ALIGNMENT) ||
            hasPermission(PERMISSIONS.CREATE_CONTENT_DRAFT) ||
            hasPermission(PERMISSIONS.AUTHOR_CONTENT) ||
            hasPermission(PERMISSIONS.MANAGE_CONTENT_VERSIONS)))),
  );
  const canUpdateCompliance = hasPermission(PERMISSIONS.UPDATE_COMPLIANCE_CHECKLIST);
  const canIssueCompliance = hasPermission(PERMISSIONS.ISSUE_MLR_CODE);
  const canCreateLinkedDocument = hasPermission(PERMISSIONS.CREATE_REQUEST);
  const canEdit = Boolean(
    request &&
      (isAdmin ||
        (isRequester &&
          ["DRAFT", "RETURNED_TO_SPOC", "SPOC_REVISION_IN_PROGRESS", "THERAPY_CHANGES_REQUESTED", "MARKETING_CHANGES_REQUESTED"].includes(request.status))),
  );
  const latestDesignJob = useMemo(
    () =>
      [...designJobs].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      )[0] ?? null,
    [designJobs],
  );
  const activeDesignBrief = request?.active_design_brief ?? latestDesignJob;
  const hasIssuedMlrCode = complianceRecords.some(
    (record) => record.record_status === "CODE_ISSUED" && Boolean(record.mlr_code),
  );
  const canSendToDesign = hasPermission(PERMISSIONS.SEND_TO_DESIGN) || isRequester;
  const isAssignedDesigner = Boolean(latestDesignJob && user?.id === latestDesignJob.assigned_designer_id);
  const canUploadDesign = hasPermission(PERMISSIONS.MANAGE_DESIGN) || isAssignedDesigner;
  const canReviewDesignDraft = Boolean(
    request &&
      (isAdmin ||
        (isAssignedTherapyLead &&
          (hasPermission(PERMISSIONS.REVIEW_DESIGN_DRAFT) ||
            hasPermission(PERMISSIONS.APPROVE_DESIGN_DRAFT) ||
            hasPermission(PERMISSIONS.REQUEST_DESIGN_REVISION)))),
  );
  const canSubmitDesignReview = canUploadDesign;
  const canApproveDesign = hasPermission(PERMISSIONS.MANAGE_DESIGN) || hasPermission(PERMISSIONS.FINAL_APPROVE) || isRequester;
  const canRequestDesignRevision = canApproveDesign;
  const canCancelDesign =
    isAdmin ||
    hasPermission(PERMISSIONS.MANAGE_DESIGN) ||
    hasPermission(PERMISSIONS.FINAL_APPROVE) ||
    isRequester ||
    Boolean(latestDesignJob && user?.id === latestDesignJob.created_by_id);
  const canGrantFinalApproval = hasPermission(PERMISSIONS.FINAL_APPROVE);
  const canWithdrawApprovedMaterial = hasPermission(PERMISSIONS.MANAGE_APPROVED_MATERIALS);
  const currentComplianceRecord = getPrimaryComplianceRecord(complianceRecords);
  const preferredComplianceContentVersion = getPreferredRequestComplianceContentVersion(contentVersions);
  const preferredPreviewAsset = (preferredComplianceContentVersion?.asset ?? null) as ViewerAsset | null;
  const workspaceDraftVersions = useMemo(
    () =>
      primaryContentWorkspace
        ? sortDraftVersions(
            contentVersions.filter(
              (version) =>
                version.document_id === primaryContentWorkspace.id &&
                isDraftContentVersion(version),
            ),
          )
        : [],
    [contentVersions, primaryContentWorkspace],
  );
  const currentDraftVersion =
    workspaceDraftVersions.find((version) => version.is_current) ?? workspaceDraftVersions[0] ?? null;
  const canSubmitMedicalReview = Boolean(request?.medical_submission_readiness?.can_submit_medical_review);
  const submittedMedicalVersion = request?.submitted_medical_version ?? request?.current_draft_version ?? null;
  const approvedDesignBriefVersion = useMemo(() => {
    const approvedVersionId = activeDesignBrief?.approved_content_version_id;
    if (approvedVersionId) {
      const matchingVersion = contentVersions.find((version) => version.id === approvedVersionId);
      if (matchingVersion) {
        return matchingVersion;
      }
    }

    const medicallyApprovedVersion =
      contentVersions.find(
        (version) =>
          version.status === "MEDICAL_CONTENT_APPROVED" &&
          (!primaryContentWorkspace || version.document_id === primaryContentWorkspace.id),
      ) ?? null;
    return medicallyApprovedVersion ?? submittedMedicalVersion ?? currentDraftVersion ?? null;
  }, [activeDesignBrief?.approved_content_version_id, contentVersions, currentDraftVersion, primaryContentWorkspace, submittedMedicalVersion]);
  const canCreateDesignBrief = Boolean(
    request &&
      (request.can_create_design_brief ??
        (request.status === "MEDICAL_CONTENT_APPROVED" &&
          canUseAction("CREATE_DESIGN_BRIEF") &&
          (isAdmin || isAssignedTherapyLead) &&
          hasPermission(PERMISSIONS.CREATE_DESIGN_BRIEF))),
  );
  const canSubmitDesignBrief = Boolean(
    request &&
      (request.can_submit_design_brief ??
        (request.status === "DESIGN_BRIEF_IN_PROGRESS" &&
          canUseAction("SUBMIT_DESIGN_BRIEF") &&
          (isAdmin || isAssignedTherapyLead) &&
          hasPermission(PERMISSIONS.SUBMIT_DESIGN_BRIEF))),
  );
  const canReviewMedicalContent = isAdmin || hasPermission(PERMISSIONS.REVIEW_MEDICAL_CONTENT);
  const medicalReviewTask = request?.medical_review_task_summary ?? null;
  const isAssignedMedicalReviewer = Boolean(
    request &&
      medicalReviewTask &&
      user?.id &&
      (isAdmin ||
        medicalReviewTask.assigned_user_id === user.id ||
        (!medicalReviewTask.assigned_user_id &&
          medicalReviewTask.assigned_group_id !== null &&
          currentUserGroupIds.has(medicalReviewTask.assigned_group_id))),
  );
  const hasMedicalReviewNavigationAction = Boolean(
    request &&
      request.ui_visibility?.available_actions &&
      (canUseAction("START_MEDICAL_REVIEW") || canUseAction("CONTINUE_MEDICAL_REVIEW")),
  );
  const canContinueMedicalReview = Boolean(
    request &&
      medicalReviewNavigationStatuses.includes(request.status) &&
      canReviewMedicalContent &&
      (hasMedicalReviewNavigationAction ||
        (!request.ui_visibility?.available_actions && isAssignedMedicalReviewer)),
  );
  const nextDraftVersionNumber = (workspaceDraftVersions[0]?.version_number ?? request?.draft_versions_count ?? 0) + 1;
  const designContentVersions = useMemo(
    () =>
      [...contentVersions]
        .filter((version) => version.content_stage === "DESIGN")
        .sort((left, right) => {
          if (left.is_current !== right.is_current) {
            return left.is_current ? -1 : 1;
          }
          if (left.version_number !== right.version_number) {
            return right.version_number - left.version_number;
          }
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        }),
    [contentVersions],
  );
  const codeIssuedComplianceRecords = useMemo(
    () =>
      [...complianceRecords]
        .filter(
          (record) =>
            record.record_status === "CODE_ISSUED" &&
            Boolean(record.mlr_code),
        )
        .sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
        ),
    [complianceRecords],
  );
  const requestAssetOptions = useMemo(
    () =>
      contentVersions
        .filter((version) => version.asset)
        .map((version) => version.asset!)
        .filter((asset, index, allAssets) => allAssets.findIndex((entry) => entry.id === asset.id) === index),
    [contentVersions],
  );
  const showFormalMlrPanel = Boolean(
    request &&
      canShowPanel("FORMAL_MLR") &&
      formalMlrStatuses.includes(request.status),
  );
  const showLinkedDocumentsSection = showFormalMlrPanel;
  const showMlrReviewSection = showFormalMlrPanel;
  const showComplianceSection = showFormalMlrPanel;
  const showDesignSection = Boolean(
    request && legacyDesignProductionStatuses.includes(request.status),
  );
  const showDesignBriefSection = Boolean(
    request &&
      canShowPanel("DESIGN_BRIEF") &&
      designBriefPanelStatuses.includes(request.status),
  );
  const showFinalApprovalSection = Boolean(
    request && finalApprovalPanelStatuses.includes(request.status),
  );
  const showDistributionSection = Boolean(
    request &&
      (distributionPanelStatuses.includes(request.status) || approvedMaterial !== null),
  );
  const currentNextStep = request ? getCurrentNextStep(request) : null;
  const latestOpenRevisionCycle = useMemo(
    () =>
      [...revisionCycles]
        .filter((cycle) => cycle.status === "OPEN")
        .sort((left, right) => right.cycle_number - left.cycle_number)[0] ?? null,
    [revisionCycles],
  );

  const heroPrimaryAction = request ? (
    ["SUBMITTED_PENDING_REGIONAL_REVIEW", "RESUBMITTED", "RESUBMITTED_PENDING_REGIONAL_REVIEW", "UNDER_REGIONAL_REVIEW"].includes(request.status) &&
    canShowPanel("REGIONAL_EVALUATION") &&
    (canRegionalEvaluate || canApproveRouteRegional || canRequestModification || canRegionalEdit || canReturnWithRegionalEdits || canRejectRegional || canDeferRegional || canMergeRegional) ? (
      <a href="#active-stage-panel" className={primaryButtonClass}>
        Open Regional Evaluation
      </a>
    ) : request.status === "APPROVED_ASSIGNED_TO_THERAPY_LEAD" && canStartTherapyDraft ? (
      <a href="#active-stage-panel" className={primaryButtonClass}>
        Start Draft Creation
      </a>
    ) : request.status === "DRAFT_IN_PROGRESS" && request.primary_content_workspace ? (
      <Link to={`/documents/${request.primary_content_workspace.id}`} className={primaryButtonClass}>
        Open Content Dashboard
      </Link>
    ) : request.status === "DRAFT_IN_PROGRESS" && (isAssignedTherapyLead || canCreateContentWorkspace) ? (
      <a href="#active-stage-panel" className={primaryButtonClass}>
        Create Content Dashboard
      </a>
    ) : request.status === "MEDICAL_REVISION_REQUIRED" && canStartMedicalRevision ? (
      <a href="#active-stage-panel" className={primaryButtonClass}>
        Start Medical Revision
      </a>
    ) : request.status === "MEDICAL_REVISION_IN_PROGRESS" && request.primary_content_workspace ? (
      <Link to={`/documents/${request.primary_content_workspace.id}/authoring`} className={primaryButtonClass}>
        Open Authoring Studio
      </Link>
    ) : medicalReviewNavigationStatuses.includes(request.status) && canContinueMedicalReview ? (
      <Link to={`/requests/${request.id}/medical-review`} className={primaryButtonClass}>
        Continue Medical Review
      </Link>
    ) : ["MEDICAL_CONTENT_APPROVED", "DESIGN_BRIEF_IN_PROGRESS"].includes(request.status) && (canCreateDesignBrief || canSubmitDesignBrief) ? (
      <a href="#design-brief-panel" className={primaryButtonClass}>
        {request.status === "MEDICAL_CONTENT_APPROVED" ? "Create Design Brief" : "Complete Design Brief"}
      </a>
    ) : request.status === "DESIGN_DRAFT_UPLOADED" && canReviewDesignDraft ? (
      <Link to={`/requests/${request.id}/design`} className={primaryButtonClass}>
        Review Design Draft
      </Link>
    ) : request.status === "DESIGN_REVIEW_IN_PROGRESS" && canReviewDesignDraft ? (
      <Link to={`/requests/${request.id}/design`} className={primaryButtonClass}>
        Continue Design Review
      </Link>
    ) : ["DESIGN_BRIEF_SUBMITTED", "DESIGN_IN_PROGRESS", "DESIGN_DRAFT_UPLOADED", "DESIGN_REVIEW_IN_PROGRESS", "DESIGN_REVISION_REQUIRED", "DESIGN_REVISION_IN_PROGRESS", "DESIGN_APPROVED"].includes(request.status) && hasPermission(PERMISSIONS.VIEW_DESIGN_BRIEF) ? (
      <Link to={`/requests/${request.id}/design`} className={primaryButtonClass}>
        Open Design Production
      </Link>
    ) : request.status === "READY_FOR_MLR" || request.status === "MLR_CHANGES_REQUESTED" ? (
      canCreateLinkedDocument ? (
        <Link to={`/documents/create?request_id=${request.id}`} className={primaryButtonClass}>
          Add Review Content
        </Link>
      ) : (
        <a href="#active-stage-panel" className={primaryButtonClass}>
          Open Active Stage Panel
        </a>
      )
    ) : request.status === "MLR_IN_REVIEW" && hasPermission(PERMISSIONS.REVIEW_MLR) ? (
      <Link to="/tasks" className={primaryButtonClass}>
        Open My Queue
      </Link>
    ) : request.status === "FINAL_APPROVED" &&
      (hasPermission(PERMISSIONS.CREATE_DISTRIBUTION) || hasPermission(PERMISSIONS.RELEASE_DISTRIBUTION)) ? (
      <Link
        to={hasPermission(PERMISSIONS.CREATE_DISTRIBUTION) ? "/distribution/create" : "/distribution"}
        className={primaryButtonClass}
      >
        {hasPermission(PERMISSIONS.CREATE_DISTRIBUTION) ? "Create Distribution Package" : "Open Distribution"}
      </Link>
    ) : (
      <a href="#active-stage-panel" className={primaryButtonClass}>
        Open Active Stage Panel
      </a>
    )
  ) : undefined;

  const fetchRequestBundle = useCallback(async (background = false) => {
    if (!requestId) {
      setErrorMessage("Content request not found.");
      setIsLoading(false);
      return;
    }

    if (!background) {
      setIsLoading(true);
    }
    setErrorMessage(null);
    setHistoryErrorMessage(null);
    setRevisionCyclesErrorMessage(null);
    setMedicalRevisionContextErrorMessage(null);
    setAlignmentErrorMessage(null);
    setLinkedDocumentsErrorMessage(null);
    setContentVersionsErrorMessage(null);
    setDesignErrorMessage(null);
    setAnnotationErrorMessage(null);
    setComplianceErrorMessage(null);
    setApprovedMaterialErrorMessage(null);
    setApprovedMaterialHistoryErrorMessage(null);

    try {
      const settle = <T,>(promise: Promise<T>) =>
        promise.then(
          (value) => ({ status: "fulfilled" as const, value }),
          (reason: unknown) => ({ status: "rejected" as const, reason }),
        );
      const requestPromise = getMaterialRequest(requestId);
      const historyPromise = settle(getMaterialRequestHistory(requestId));
      const revisionCyclesPromise = settle(getContentRequestRevisionCycles(requestId));
      const contentVersionsPromise = settle(getRequestContentVersions(requestId, { page_size: 100 }));
      const designJobsPromise = settle(getRequestDesignJobs(requestId));
      const reviewAnnotationsPromise = settle(getRequestReviewAnnotations(requestId, { page_size: 100 }));
      const complianceRecordsPromise = settle(getRequestComplianceRecords(requestId, { page_size: 100 }));
      const linkedDocumentsPromise = settle(getMaterialRequestDocuments(requestId, { page_size: 10 }));

      const nextRequest = await requestPromise;
      const shouldLoadTherapyAlignment = canShowRequestPanel(nextRequest, "THERAPY_ALIGNMENT");
      const shouldLoadMedicalRevision = ["MEDICAL_REVISION_REQUIRED", "MEDICAL_REVISION_IN_PROGRESS"].includes(nextRequest.status);
      const shouldLoadApprovedMaterial = statusesWithApprovedMaterialLookup.includes(nextRequest.status);
      const medicalRevisionContextPromise = shouldLoadMedicalRevision
        ? settle(getMedicalRevisionContext(requestId))
        : Promise.resolve({ status: "fulfilled" as const, value: null as MedicalRevisionContext | null });
      const approvedMaterialPromise = shouldLoadApprovedMaterial
        ? settle(getRequestApprovedMaterial(requestId))
        : Promise.resolve({ status: "fulfilled" as const, value: null as ApprovedMaterial | null });
      setRequest(nextRequest);
      if (!background) {
        setIsLoading(false);
      }

      const [
        historyResult,
        revisionCyclesResult,
        medicalRevisionContextResult,
        alignmentCommentsResult,
        contentVersionsResult,
        designJobsResult,
        reviewAnnotationsResult,
        complianceRecordsResult,
      ] = await Promise.all([
        historyPromise,
        revisionCyclesPromise,
        medicalRevisionContextPromise,
        shouldLoadTherapyAlignment
          ? settle(listContentRequestComments(requestId, "THERAPY_ALIGNMENT"))
          : Promise.resolve({ status: "fulfilled" as const, value: [] as ContentCollaborationComment[] }),
        contentVersionsPromise,
        designJobsPromise,
        reviewAnnotationsPromise,
        complianceRecordsPromise,
      ] as const);

      let nextHistory: MaterialRequestHistory[] = [];
      let nextHistoryErrorMessage: string | null = null;
      if (historyResult.status === "fulfilled") {
        nextHistory = historyResult.value;
      } else {
        nextHistory = [];
        nextHistoryErrorMessage = null;
      }

      let nextRevisionCycles: ContentRequestRevisionCycle[] = [];
      let nextRevisionCyclesErrorMessage: string | null = null;
      if (revisionCyclesResult.status === "fulfilled") {
        nextRevisionCycles = revisionCyclesResult.value;
      } else {
        nextRevisionCyclesErrorMessage = optionalSectionErrorMessage(
          revisionCyclesResult.reason,
          "Revision history is not available for your role at this stage.",
        );
      }

      let nextMedicalRevisionContext: MedicalRevisionContext | null = null;
      let nextMedicalRevisionContextErrorMessage: string | null = null;
      if (medicalRevisionContextResult.status === "fulfilled") {
        nextMedicalRevisionContext = medicalRevisionContextResult.value;
      } else {
        nextMedicalRevisionContextErrorMessage = optionalSectionErrorMessage(
          medicalRevisionContextResult.reason,
          "Medical feedback is not available for your role at this stage.",
        );
      }

      let nextAlignmentComments: ContentCollaborationComment[] = [];
      let nextAlignmentErrorMessage: string | null = null;
      if (alignmentCommentsResult.status === "fulfilled") {
        nextAlignmentComments = alignmentCommentsResult.value;
      } else {
        nextAlignmentErrorMessage = optionalSectionErrorMessage(
          alignmentCommentsResult.reason,
          "Therapy Alignment comments are not available for your role at this stage.",
        );
      }

      let nextContentVersions: ContentVersion[] = [];
      let nextContentVersionsErrorMessage: string | null = null;
      if (contentVersionsResult.status === "fulfilled") {
        nextContentVersions = contentVersionsResult.value.items;
      } else {
        nextContentVersionsErrorMessage = optionalSectionErrorMessage(
          contentVersionsResult.reason,
          "Content versions are not available for your role at this stage.",
        );
      }

      let nextDesignJobs: DesignJob[] = [];
      let nextDesignHistory: DesignJobHistory[] = [];
      let nextDesignErrorMessage: string | null = null;
      if (designJobsResult.status === "fulfilled") {
        nextDesignJobs = designJobsResult.value;
        const latestDesignJobForRequest =
          [...nextDesignJobs].sort(
            (left, right) =>
              new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          )[0] ?? null;
        if (latestDesignJobForRequest) {
          try {
            nextDesignHistory = await getDesignJobHistory(latestDesignJobForRequest.id);
          } catch (error) {
            nextDesignErrorMessage = optionalSectionErrorMessage(
              error,
              "Design job history is not available for your role at this stage.",
            );
          }
        }
      } else {
        nextDesignErrorMessage = optionalSectionErrorMessage(
          designJobsResult.reason,
          "Design jobs are not available for your role at this stage.",
        );
      }

      let nextReviewAnnotations: ReviewAnnotation[] = [];
      let nextAnnotationErrorMessage: string | null = null;
      if (reviewAnnotationsResult.status === "fulfilled") {
        nextReviewAnnotations = reviewAnnotationsResult.value.items;
      } else {
        nextAnnotationErrorMessage = optionalSectionErrorMessage(
          reviewAnnotationsResult.reason,
          "Review comments are not available for your role at this stage.",
        );
      }

      let nextComplianceRecords: LegalComplianceRecord[] = [];
      let nextComplianceErrorMessage: string | null = null;
      if (complianceRecordsResult.status === "fulfilled") {
        nextComplianceRecords = complianceRecordsResult.value.items;
      } else {
        nextComplianceErrorMessage = optionalSectionErrorMessage(
          complianceRecordsResult.reason,
          "Compliance records are not available for your role at this stage.",
        );
      }

      let nextLinkedDocuments: LinkedDocument[] = [];
      let nextLinkedDocumentsErrorMessage: string | null = null;
      const linkedDocumentsResult = await linkedDocumentsPromise;
      if (linkedDocumentsResult.status === "fulfilled") {
        const linkedDocuments = linkedDocumentsResult.value;
        nextLinkedDocuments = linkedDocuments.items.map((document) => ({
          ...document,
          latestVersionNumber: nextContentVersions
            .filter((version) => version.document_id === document.id)
            .reduce((highest, version) => Math.max(highest, version.version_number), 1),
          latestMlrContentVersion: getLatestMlrContentVersion(document.id, nextContentVersions),
        }));
      } else {
        nextLinkedDocumentsErrorMessage = optionalSectionErrorMessage(
          linkedDocumentsResult.reason,
          "Review content records are not available for your role at this stage.",
        );
      }

      let nextApprovedMaterial: ApprovedMaterial | null = null;
      let nextApprovedMaterialHistory: ApprovedMaterialHistory[] = [];
      let nextApprovedMaterialErrorMessage: string | null = null;
      let nextApprovedMaterialHistoryErrorMessage: string | null = null;
      const approvedMaterialResult = await approvedMaterialPromise;
      if (approvedMaterialResult.status === "fulfilled") {
        nextApprovedMaterial = approvedMaterialResult.value;
        if (nextApprovedMaterial) {
          try {
            nextApprovedMaterialHistory = await getApprovedMaterialHistory(nextApprovedMaterial.id);
          } catch (error) {
            nextApprovedMaterialHistoryErrorMessage = optionalSectionErrorMessage(
              error,
              "Approved material history is not available for your role at this stage.",
            );
          }
        }
      } else {
        if (!(axios.isAxiosError(approvedMaterialResult.reason) && approvedMaterialResult.reason.response?.status === 404)) {
          nextApprovedMaterialErrorMessage = optionalSectionErrorMessage(
            approvedMaterialResult.reason,
            "Approved material is not available for your role at this stage.",
          );
        }
      }
      setRequest(nextRequest);
      setHistory(nextHistory);
      setHistoryErrorMessage(nextHistoryErrorMessage);
      setRevisionCycles(nextRevisionCycles);
      setRevisionCyclesErrorMessage(nextRevisionCyclesErrorMessage);
      setMedicalRevisionContext(nextMedicalRevisionContext);
      setMedicalRevisionContextErrorMessage(nextMedicalRevisionContextErrorMessage);
      setAlignmentComments(nextAlignmentComments);
      setAlignmentErrorMessage(nextAlignmentErrorMessage);
      setContentVersions(nextContentVersions);
      setContentVersionsErrorMessage(nextContentVersionsErrorMessage);
      setDesignJobs(nextDesignJobs);
      setDesignHistory(nextDesignHistory);
      setDesignErrorMessage(nextDesignErrorMessage);
      setReviewAnnotations(nextReviewAnnotations);
      setAnnotationErrorMessage(nextAnnotationErrorMessage);
      setComplianceRecords(nextComplianceRecords);
      setComplianceErrorMessage(nextComplianceErrorMessage);
      setApprovedMaterial(nextApprovedMaterial);
      setApprovedMaterialHistory(nextApprovedMaterialHistory);
      setApprovedMaterialErrorMessage(nextApprovedMaterialErrorMessage);
      setApprovedMaterialHistoryErrorMessage(nextApprovedMaterialHistoryErrorMessage);
      setDocuments(nextLinkedDocuments);
      setLinkedDocumentsErrorMessage(nextLinkedDocumentsErrorMessage);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setRequest(null);
      setHistory([]);
      setHistoryErrorMessage(null);
      setRevisionCycles([]);
      setRevisionCyclesErrorMessage(null);
      setMedicalRevisionContext(null);
      setMedicalRevisionContextErrorMessage(null);
      setAlignmentComments([]);
      setAlignmentErrorMessage(null);
      setContentVersions([]);
      setContentVersionsErrorMessage(null);
      setDesignJobs([]);
      setDesignHistory([]);
      setReviewAnnotations([]);
      setComplianceRecords([]);
      setDocuments([]);
      setLinkedDocumentsErrorMessage(null);
      setApprovedMaterial(null);
      setApprovedMaterialHistory([]);
      setApprovedMaterialErrorMessage(null);
      setApprovedMaterialHistoryErrorMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  const refreshReviewAnnotations = useCallback(async () => {
    if (!requestId) {
      return;
    }

    setIsAnnotationLoading(true);
    setAnnotationErrorMessage(null);

    try {
      const response = await getRequestReviewAnnotations(requestId, { page_size: 100 });
      setReviewAnnotations(response.items);
    } catch (error) {
      setReviewAnnotations([]);
      setAnnotationErrorMessage(
        optionalSectionErrorMessage(error, "Review comments are not available for your role at this stage."),
      );
    } finally {
      setIsAnnotationLoading(false);
    }
  }, [requestId]);

  const refreshComplianceRecords = useCallback(async () => {
    if (!requestId) {
      return;
    }

    setIsComplianceLoading(true);
    setComplianceErrorMessage(null);

    try {
      const response = await getRequestComplianceRecords(requestId, { page_size: 100 });
      setComplianceRecords(response.items);
    } catch (error) {
      setComplianceRecords([]);
      setComplianceErrorMessage(
        optionalSectionErrorMessage(error, "Compliance records are not available for your role at this stage."),
      );
    } finally {
      setIsComplianceLoading(false);
    }
  }, [requestId]);

  const loadSendToDesignOptions = useCallback(async () => {
    setIsSendToDesignOptionsLoading(true);
    setDesignErrorMessage(null);
    try {
      const [agencies, users] = await Promise.all([
        getDesignAgencies({ include_inactive: false }),
        getUsers(),
      ]);
      setDesignAgencies(agencies.filter((agency) => agency.is_active));
      setAvailableUsers(users.filter((candidate) => candidate.is_active));
    } catch (error) {
      setDesignErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSendToDesignOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequestBundle(false);
  }, [fetchRequestBundle]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void fetchRequestBundle(true);
    }
  }, [refreshNonce]);

  useEffect(() => {
    if (request) {
      updateActiveTab({
        label: request.request_number ?? "Draft",
        helperText: request.title ?? "Untitled content request",
      });
    }
  }, [request, updateActiveTab]);

  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (isSendToDesignOpen) {
      void loadSendToDesignOptions();
    }
  }, [isSendToDesignOpen, loadSendToDesignOptions]);

  const workflowSteps = useMemo(
    () => (request ? getLifecycleSteps(request, history) : []),
    [history, request],
  );
  const filteredReviewAnnotations = useMemo(() => {
    if (annotationFilter === "ALL") {
      return reviewAnnotations;
    }

    if (annotationFilter === "OPEN_MANDATORY") {
      return reviewAnnotations.filter(
        (annotation) =>
          annotation.is_mandatory_change &&
          (annotation.status === "OPEN" || annotation.status === "REOPENED"),
      );
    }

    if (annotationFilter === "OPEN_OPTIONAL") {
      return reviewAnnotations.filter(
        (annotation) =>
          !annotation.is_mandatory_change &&
          (annotation.status === "OPEN" || annotation.status === "REOPENED"),
      );
    }

    if (annotationFilter === "RESOLVED") {
      return reviewAnnotations.filter((annotation) => annotation.status === "RESOLVED");
    }

    return reviewAnnotations.filter((annotation) => annotation.status === "DISMISSED");
  }, [annotationFilter, reviewAnnotations]);
  const mlrSourceContentVersions = useMemo(() => {
    const selectedDocumentId = sendToDesignForm.source_document_id
      ? Number(sendToDesignForm.source_document_id)
      : null;

    return [...contentVersions]
      .filter((version) => {
        const isMlrReview =
          version.content_stage === "MLR_REVIEW" ||
          version.asset?.asset_type === "MLR_REVIEW_FILE";
        if (!isMlrReview) {
          return false;
        }
        if (selectedDocumentId === null) {
          return true;
        }
        return version.document_id === selectedDocumentId;
      })
      .sort((left, right) => {
        if (left.is_current !== right.is_current) {
          return left.is_current ? -1 : 1;
        }
        if (left.version_number !== right.version_number) {
          return right.version_number - left.version_number;
        }
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  }, [contentVersions, sendToDesignForm.source_document_id]);
  const bottomDrawerTabs = useMemo<BottomDrawerTab[]>(() => {
    if (!request) {
      return [];
    }

    const tabs: BottomDrawerTab[] = [];

    tabs.push({
      id: "history",
      label: "History",
      count: history.length,
      content: <HistoryTimeline history={history} errorMessage={historyErrorMessage} />,
    });

    if (showMlrReviewSection && (reviewAnnotations.length > 0 || annotationErrorMessage)) {
      tabs.push({
        id: "comments",
        label: "Comments",
        count: reviewAnnotations.length,
        content: (
          <CommentsSummary
            annotations={reviewAnnotations}
            errorMessage={annotationErrorMessage}
          />
        ),
      });
    }

    if (showLinkedDocumentsSection && (documents.length > 0 || linkedDocumentsErrorMessage)) {
      tabs.push({
        id: "files",
        label: "Files",
        count: documents.length,
        content: (
          <FilesSummary
            documents={documents}
            errorMessage={linkedDocumentsErrorMessage}
          />
        ),
      });
    }

    if (canViewAudit) {
      tabs.push({
        id: "audit",
        label: "Audit",
        content: <AuditSummary request={request} />,
      });
    }

    return tabs;
  }, [
    annotationErrorMessage,
    canViewAudit,
    documents,
    history,
    historyErrorMessage,
    linkedDocumentsErrorMessage,
    request,
    reviewAnnotations,
    showLinkedDocumentsSection,
    showMlrReviewSection,
  ]);

  async function runAction(
    action: MaterialRequestTransitionAction,
    options: ActionOptions,
  ) {
    if (!request) {
      return;
    }

    if (options.confirmMessage && !window.confirm(options.confirmMessage)) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (action === "submit") {
        if (request.status === "RETURNED_TO_SPOC" || request.status === "SPOC_REVISION_IN_PROGRESS") {
          await resubmitAfterRegionalEdits(request.id, {
            response_notes: options.spoc_response_notes ?? "",
            spoc_attachment_ids: options.spoc_attachment_ids ?? [],
          });
        } else {
          await submitMaterialRequest(
            request.id,
            options.spoc_response_notes || options.spoc_attachment_ids?.length
              ? {
                  spoc_response_notes: options.spoc_response_notes ?? null,
                  spoc_attachment_ids: options.spoc_attachment_ids ?? [],
                }
              : undefined,
          );
        }
      } else {
        await transitionMaterialRequest(request.id, action, options.comment ?? null);
      }
      setSuccessMessage(options.successMessage);
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function runRegionalAction(
    action: RegionalActionKind,
    payload: RegionalActionPayload,
    successMessage: string,
  ) {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (action === "start") {
        await startRegionalEvaluation(request.id, payload.notes ?? null);
      }
      if (action === "approve-route") {
        const preview = await getContentRequestRegionalRoutingPreview(request.id);
        if (!preview.therapy_lead.assignment_found || !preview.therapy_lead.assigned_user_id) {
          setErrorMessage(preview.therapy_lead.reason || "No Therapy Lead mapping is configured for this request.");
          return;
        }
        const confirmed = window.confirm(
          `Approve and route to Therapy Lead user ${preview.therapy_lead.assigned_user_id}?`,
        );
        if (!confirmed) {
          return;
        }
        await approveRouteRegionalRequest(request.id, payload.notes ?? null);
      }
      if (action === "request-modification" && payload.return_reason_code && payload.return_notes) {
        await requestRegionalModification(request.id, {
          return_reason_code: payload.return_reason_code,
          return_reason_label: payload.return_reason_label ?? null,
          return_notes: payload.return_notes,
          required_corrections: payload.required_corrections ?? [],
          return_attachment_ids: payload.return_attachment_ids ?? [],
        });
      }
      if (action === "return-with-edits" && payload.return_notes) {
        await returnToSpocWithRegionalEdits(request.id, {
          amendment_id: payload.amendment_id ?? null,
          edited_fields: payload.edited_fields ?? {},
          reason_category: payload.return_reason_code ?? null,
          return_notes: payload.return_notes,
          required_corrections: payload.required_corrections ?? [],
        });
      }
      if (action === "reject" && payload.reason) {
        await rejectRegionalRequest(request.id, { reason: payload.reason });
      }
      if (action === "defer" && payload.defer_reason && payload.defer_until) {
        await deferRegionalRequest(request.id, {
          defer_reason: payload.defer_reason,
          defer_until: payload.defer_until,
        });
      }
      if (action === "merge" && payload.merged_into_request_id && payload.reason) {
        await mergeRegionalRequest(request.id, {
          merged_into_request_id: payload.merged_into_request_id,
          reason: payload.reason,
        });
      }

      setSuccessMessage(successMessage);
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function runAcceptRegionalEdits() {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await acceptRegionalEdits(request.id);
      setSuccessMessage("Regional proposed edits accepted.");
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function runStartTherapyDraftCreation() {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await startTherapyDraftCreation(request.id);
      setSuccessMessage("Therapy draft creation started.");
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function runStartMedicalRevision() {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await startMedicalRevision(request.id);
      setSuccessMessage("Medical revision started.");
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function runCreateContentWorkspace() {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createContentWorkspace(request.id);
      setSuccessMessage("Content dashboard created.");
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  function openDraftVersionModal() {
    const isMedicalRevision = request?.status === "MEDICAL_REVISION_IN_PROGRESS";
    setDraftVersionForm({
      version_label: isMedicalRevision ? `Revised Draft V${nextDraftVersionNumber}` : `Draft V${nextDraftVersionNumber}`,
      draft_notes: "",
      change_summary: isMedicalRevision
        ? "Medical revision changes addressing Medical Review feedback."
        : "Initial Therapy Lead draft created from approved content request.",
    });
    setDraftVersionFile(null);
    setDraftVersionErrorMessage(null);
    setIsDraftVersionModalOpen(true);
  }

  async function handleCreateDraftVersion() {
    if (!primaryContentWorkspace) {
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
      await createContentWorkspaceDraftVersion(primaryContentWorkspace.id, {
        version_label: draftVersionForm.version_label,
        draft_notes: draftNotes || null,
        change_summary: changeSummary,
        draft_file: draftVersionFile,
      });
      setIsDraftVersionModalOpen(false);
      setSuccessMessage(request?.status === "MEDICAL_REVISION_IN_PROGRESS" ? "Revised draft version created." : "Draft version created.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDraftVersionErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleCreateAlignmentComment(payload: ContentCollaborationCommentCreatePayload) {
    if (!request) {
      return;
    }

    setIsAlignmentActionLoading(true);
    setAlignmentErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createContentRequestComment(request.id, payload);
      setSuccessMessage(payload.is_decision_note ? "Therapy Alignment decision note added." : "Therapy Alignment comment added.");
      await fetchRequestBundle(true);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAlignmentErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsAlignmentActionLoading(false);
    }
  }

  async function handleResolveAlignmentComment(commentId: string) {
    if (!request) {
      return;
    }

    setIsAlignmentActionLoading(true);
    setAlignmentErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resolveContentRequestComment(request.id, commentId);
      setSuccessMessage("Therapy Alignment comment resolved.");
      await fetchRequestBundle(true);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAlignmentErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsAlignmentActionLoading(false);
    }
  }

  async function handleReopenAlignmentComment(commentId: string) {
    if (!request) {
      return;
    }

    setIsAlignmentActionLoading(true);
    setAlignmentErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await reopenContentRequestComment(request.id, commentId);
      setSuccessMessage("Therapy Alignment comment reopened.");
      await fetchRequestBundle(true);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAlignmentErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsAlignmentActionLoading(false);
    }
  }

  async function handleCompleteTherapyAlignment(payload: TherapyAlignmentCompletePayload) {
    if (!request) {
      return;
    }

    setIsAlignmentActionLoading(true);
    setAlignmentErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await completeTherapyAlignment(request.id, payload);
      setSuccessMessage("Therapy Alignment completed.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAlignmentErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsAlignmentActionLoading(false);
    }
  }

  function openMedicalSubmitModal() {
    setMedicalSubmitNotes("");
    setMedicalSubmitErrorMessage(null);
    setIsMedicalSubmitModalOpen(true);
  }

  function openMedicalRevisionResubmitModal() {
    setMedicalRevisionResubmitNotes("");
    setMedicalRevisionAddressedSummary("");
    setMedicalRevisionResubmitErrorMessage(null);
    setIsMedicalRevisionResubmitModalOpen(true);
  }

  async function handleSubmitMedicalReview() {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setMedicalSubmitErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await submitMedicalReview(request.id, {
        submission_notes: medicalSubmitNotes.trim() || null,
        content_workspace_id: primaryContentWorkspace?.id ?? null,
        content_version_id: currentDraftVersion?.id ?? request.current_draft_version?.id ?? null,
      });
      setIsMedicalSubmitModalOpen(false);
      setMedicalSubmitNotes("");
      setSuccessMessage("Draft submitted to Medical Review.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setMedicalSubmitErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleResubmitMedicalReview() {
    if (!request) {
      return;
    }

    const notes = medicalRevisionResubmitNotes.trim();
    if (!notes) {
      setMedicalRevisionResubmitErrorMessage("Resubmission notes are required.");
      return;
    }

    setIsActionLoading(true);
    setMedicalRevisionResubmitErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resubmitMedicalReview(request.id, {
        content_version_id: currentDraftVersion?.id ?? request.current_draft_version?.id ?? null,
        resubmission_notes: notes,
        addressed_comments_summary: medicalRevisionAddressedSummary.trim() || null,
      });
      setIsMedicalRevisionResubmitModalOpen(false);
      setMedicalRevisionResubmitNotes("");
      setMedicalRevisionAddressedSummary("");
      setSuccessMessage("Revised draft resubmitted to Medical Review.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setMedicalRevisionResubmitErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleSubmitMlr(documentId: number) {
    if (!request) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await submitMaterialRequestMlr(request.id, documentId, {
        comment: "Submitted from content request dashboard.",
      });
      setSuccessMessage("Review content submitted for MLR review.");
      await fetchRequestBundle();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  function promptComment(message: string): string | null {
    const comment = window.prompt(message);
    if (comment === null) {
      return null;
    }

    return comment.trim() || null;
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

  async function handleDownloadViewerAsset(asset: ViewerAsset) {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await downloadAsset(asset.id, asset.original_filename);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
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
      setComplianceErrorMessage("No content version is available for this request.");
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
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setComplianceErrorMessage(message);
      throw new Error(message);
    }
  }

  function resetFinalApprovalForm() {
    setFinalApprovalForm({
      final_content_version_id: "",
      compliance_record_id: "",
      material_title: request?.title ?? "",
      valid_from: "",
      valid_until: "",
      digital_asset_id: "",
      print_ready_asset_id: "",
      comment: "",
    });
  }

  function openFinalApprovalModal() {
    const preferredDesignVersion = designContentVersions[0];
    const preferredComplianceRecord = codeIssuedComplianceRecords[0];
    setFinalApprovalForm({
      final_content_version_id: preferredDesignVersion?.id ?? "",
      compliance_record_id: preferredComplianceRecord?.id ?? "",
      material_title: request?.title ?? "",
      valid_from: "",
      valid_until: preferredComplianceRecord?.expiry_date ?? "",
      digital_asset_id: "",
      print_ready_asset_id: "",
      comment: "",
    });
    setFinalApprovalErrorMessage(null);
    setIsFinalApprovalOpen(true);
  }

  async function handleFinalApprovalSubmit() {
    if (!request) {
      return;
    }

    setIsFinalApprovalSubmitting(true);
    setFinalApprovalErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: FinalApprovalPayload = {
      final_content_version_id: finalApprovalForm.final_content_version_id || null,
      compliance_record_id: finalApprovalForm.compliance_record_id || null,
      material_title: finalApprovalForm.material_title.trim() || null,
      valid_from: finalApprovalForm.valid_from || null,
      valid_until: finalApprovalForm.valid_until || null,
      digital_asset_id: finalApprovalForm.digital_asset_id
        ? Number(finalApprovalForm.digital_asset_id)
        : null,
      print_ready_asset_id: finalApprovalForm.print_ready_asset_id
        ? Number(finalApprovalForm.print_ready_asset_id)
        : null,
      comment: finalApprovalForm.comment.trim() || null,
    };

    try {
      await finalApproveRequest(request.id, payload);
      setIsFinalApprovalOpen(false);
      setSuccessMessage("Final approval granted and approved material created.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setFinalApprovalErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsFinalApprovalSubmitting(false);
    }
  }

  async function handleWithdrawApprovedMaterial(reason: string) {
    if (!approvedMaterial) {
      return;
    }

    setIsFinalApprovalSubmitting(true);
    setFinalApprovalErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await withdrawApprovedMaterial(approvedMaterial.id, reason);
      setSuccessMessage("Approved material withdrawn.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setFinalApprovalErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsFinalApprovalSubmitting(false);
    }
  }

  function resetSendToDesignForm() {
    setSendToDesignForm({
      source_document_id: "",
      source_content_version_id: "",
      agency_id: "",
      assigned_designer_id: "",
      design_coordinator_id: "",
      brief: "",
      design_notes: "",
      due_date: "",
    });
  }

  async function handleSendToDesignSubmit() {
    if (!requestId || !request) {
      return;
    }

    setIsDesignActionLoading(true);
    setDesignErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await sendRequestToDesign(requestId, {
        source_document_id: sendToDesignForm.source_document_id
          ? Number(sendToDesignForm.source_document_id)
          : null,
        source_content_version_id:
          sendToDesignForm.source_content_version_id || null,
        agency_id: sendToDesignForm.agency_id ? Number(sendToDesignForm.agency_id) : null,
        assigned_designer_id: sendToDesignForm.assigned_designer_id
          ? Number(sendToDesignForm.assigned_designer_id)
          : null,
        design_coordinator_id: sendToDesignForm.design_coordinator_id
          ? Number(sendToDesignForm.design_coordinator_id)
          : null,
        brief: sendToDesignForm.brief.trim() || null,
        design_notes: sendToDesignForm.design_notes.trim() || null,
        due_date: sendToDesignForm.due_date || null,
      });
      setIsSendToDesignOpen(false);
      resetSendToDesignForm();
      setSuccessMessage("Request sent to design production.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDesignErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsDesignActionLoading(false);
    }
  }

  async function handleUploadDesignDraft(file: File, payload: DesignJobUploadPayload) {
    if (!latestDesignJob) {
      return;
    }

    setIsDesignActionLoading(true);
    setDesignErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await uploadDesignJobFile(latestDesignJob.id, file, payload);
      setSuccessMessage("Design draft uploaded and moved to design review.");
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDesignErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsDesignActionLoading(false);
    }
  }

  async function handleTransitionDesignJob(action: string, comment?: string | null) {
    if (!latestDesignJob) {
      return;
    }

    setIsDesignActionLoading(true);
    setDesignErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await transitionDesignJob(latestDesignJob.id, action, comment ?? null);
      if (action === "approve_design") {
        setSuccessMessage("Design approved. Request moved to final approval.");
      } else if (action === "request_revision") {
        setSuccessMessage("Design revision requested.");
      } else if (action === "cancel") {
        setSuccessMessage("Design job cancelled.");
      } else {
        setSuccessMessage("Design job updated.");
      }
      await fetchRequestBundle();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDesignErrorMessage(message);
      setErrorMessage(message);
    } finally {
      setIsDesignActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading content request..." rows={4} />
      </PageContainer>
    );
  }

  if (!request) {
    return (
      <PageContainer>
        <ErrorState
          message={errorMessage || "Content request not found."}
          onRetry={() => void fetchRequestBundle(false)}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/design/tasks" className={secondaryButtonClass}>
            Back to Design Tasks
          </Link>
          <Link to="/requests" className={secondaryButtonClass}>
            Back to Requests
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow={request.request_number ?? "Draft"}
        title={request.title ?? "Untitled content request"}
        subtitle="Current status, owner, and next action for this content request."
        status={request.status}
        primaryAction={heroPrimaryAction}
        metadata={[
          { label: "Product", value: fallbackName(request.product?.name, request.product_id) },
          { label: "Region", value: fallbackName(request.region?.name, request.region_id) },
          { label: "Requested By", value: request.requested_by?.full_name ?? "Requester" },
          { label: "In-Market Date", value: formatDate(request.required_by_date) },
          { label: "Current Owner", value: getCurrentOwnerLabel(request) },
          { label: "Next Action", value: request.next_action_label ?? currentNextStep?.title ?? "Review current state" },
        ]}
        secondaryAction={
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Link to="/requests" className={secondaryButtonClass}>
              Back to Requests
            </Link>
            {canEdit && (
              <Link to={`/requests/${request.id}/edit`} className={secondaryButtonClass}>
                Edit Content Request
              </Link>
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

      {(request.status === "RETURNED_TO_SPOC" || request.status === "SPOC_REVISION_IN_PROGRESS") && (
        <RegionalReturnNotesPanel
          request={request}
          cycle={latestOpenRevisionCycle}
          amendment={request.active_regional_amendment ?? null}
          masterData={requestMasterData}
        />
      )}

      <LifecycleTracker steps={workflowSteps} />

      <CurrentNextStepCard
        title={currentNextStep?.title ?? "Review current state"}
        description={currentNextStep?.description ?? "Check available actions for the next lifecycle move."}
        status={<StatusBadge status={request.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <SummaryCard title="Request Summary">
            <div className="grid gap-5 xl:grid-cols-2">
              <DetailBlock title="Brief / Description" value={request.description || "No description"} />
              <DetailBlock title="Local Requirements" value={request.local_requirements || "Not set"} />
              <DetailBlock title="Business Objective" value={request.business_objective || "Not set"} />
              <DetailBlock title="Key Messages" value={request.key_messages || "Not set"} />
              <DetailBlock title="Reference Notes" value={request.reference_notes || "Not set"} />
            </div>
          </SummaryCard>

          <SummaryCard title="Audience And Channel">
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailRow label="Content Type" value={fallbackName(request.material_type?.name, request.material_type_id)} />
              <DetailRow
                label="Audience"
                value={
                  request.target_audience_ids?.length
                    ? `${fallbackName(request.target_audience?.name, request.target_audience_id)} (${request.target_audience_ids.length} selected)`
                    : fallbackName(request.target_audience?.name, request.target_audience_id)
                }
              />
              <DetailRow label="Channel" value={fallbackName(request.channel?.name, request.channel_id)} />
              <DetailRow label="HCP Specialty" value={request.target_hcp_specialty || "Not set"} />
              <DetailRow label="Country" value={fallbackName(request.country?.name, request.country_id)} />
              <DetailRow label="Therapy Area" value={fallbackName(request.therapeutic_area?.name, request.therapeutic_area_id)} />
              <DetailRow label="Brand" value={fallbackName(request.brand?.name, request.brand_id)} />
              <DetailRow label="Sub-Therapy" value={fallbackName(request.sub_therapy_area?.name, request.sub_therapy_area_id)} />
              <DetailRow label="Campaign" value={request.campaign?.name ?? (request.campaign_id ? `ID ${request.campaign_id}` : "Not set")} />
              <DetailRow label="Requested By" value={request.requested_by?.full_name ?? `User ${request.requested_by_id}`} />
            </dl>
          </SummaryCard>

          {canShowPanel("REGIONAL_EVALUATION") && (
            <SummaryCard title="Regional Evaluation">
              <div className="grid gap-5 xl:grid-cols-2">
                <DetailBlock title="Evaluation Notes" value={request.regional_evaluation_notes || "Not set"} />
                <DetailBlock title="Decision Notes" value={request.regional_decision_reason || "Not set"} />
                <DetailBlock
                  title="Evaluated By"
                  value={request.regional_evaluated_by?.full_name ?? (request.regional_evaluated_by_id ? `User ${request.regional_evaluated_by_id}` : "Not set")}
                />
                <DetailBlock
                  title="Evaluated At"
                  value={request.regional_evaluated_at ? formatDateTime(request.regional_evaluated_at) : "Not set"}
                />
              </div>
            </SummaryCard>
          )}

          {canShowPanel("THERAPY_ALIGNMENT") && (
            <TherapyAlignmentPanel
              request={request}
              comments={alignmentComments}
              errorMessage={alignmentErrorMessage}
              isSubmitting={isAlignmentActionLoading}
              currentUserId={user?.id}
              isAssignedTherapyLead={isAssignedTherapyLead}
              isAdmin={isAdmin}
              canComment={canCommentOnContentRequest}
              canComplete={canCompleteTherapyAlignment}
              canUseInternalTherapy={canUseInternalTherapyComments}
              canUseAdminOnly={canUseAdminOnlyComments}
              onCreateComment={handleCreateAlignmentComment}
              onResolveComment={handleResolveAlignmentComment}
              onReopenComment={handleReopenAlignmentComment}
              onCompleteAlignment={handleCompleteTherapyAlignment}
            />
          )}

          {canShowPanel("MEDICAL_REVIEW") && (
            <MedicalReviewPanel
              request={request}
              workspace={primaryContentWorkspace}
              submittedVersion={submittedMedicalVersion}
              currentDraftVersion={currentDraftVersion}
              task={request.medical_review_task_summary ?? null}
              medicalRevisionContext={medicalRevisionContext}
              medicalRevisionContextErrorMessage={medicalRevisionContextErrorMessage}
              canStartMedicalRevision={canStartMedicalRevision}
              canReviewMedicalContent={canReviewMedicalContent}
              canContinueMedicalReview={canContinueMedicalReview}
              onStartMedicalRevision={runStartMedicalRevision}
              onDownloadContentVersion={handleDownloadContentVersion}
            />
          )}

          {showDesignBriefSection && (
            <div id="design-brief-panel">
              <DesignBriefPanel
                request={request}
                brief={activeDesignBrief ?? null}
                approvedVersion={approvedDesignBriefVersion}
                workspace={primaryContentWorkspace}
                channels={requestMasterData.channels}
                canCreate={canCreateDesignBrief}
                canSubmit={canSubmitDesignBrief}
                isAssignedTherapyLead={isAssignedTherapyLead}
                isAdmin={isAdmin}
                onChanged={async (message) => {
                  setSuccessMessage(message);
                  await fetchRequestBundle(true);
                }}
              />
            </div>
          )}

          <SummaryCard title="Budget And Timeline">
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DetailRow label="Priority" value={getStatusLabel(request.priority)} />
              <DetailRow label="In-Market Date" value={formatDate(request.required_by_date)} />
              <DetailRow label="Budget Code" value={request.budget_code || "Not set"} />
              <DetailRow label="Urgency Justification" value={request.urgency_justification || "Not set"} />
            </dl>
          </SummaryCard>

          <ReferenceMaterials
            materials={request.reference_materials ?? []}
            onView={setSelectedReferenceMaterial}
            onDownload={(material) => void downloadContentRequestReferenceMaterial(request.id, material)}
          />

          <RevisionHistoryPanel
            cycles={revisionCycles}
            errorMessage={revisionCyclesErrorMessage}
          />

          {showLinkedDocumentsSection && (
            <LinkedDocuments
              request={request}
              documents={documents}
              errorMessage={linkedDocumentsErrorMessage}
              isActionLoading={isActionLoading}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              canCreateLinkedDocument={canCreateLinkedDocument}
              onSubmitMlr={handleSubmitMlr}
            />
          )}

          {showDesignSection && (
            <>
              <SummaryCard
                title="Design"
                subtitle="Start design production after MLR approval and MLR code issuance."
                action={
                  request.status === "MLR_APPROVED" ? (
                    <button
                      type="button"
                      disabled={!canSendToDesign || !hasIssuedMlrCode || isDesignActionLoading}
                      onClick={() => {
                        setIsSendToDesignOpen((open) => !open);
                        setDesignErrorMessage(null);
                      }}
                      className={primaryButtonClass}
                    >
                      Send to Design
                    </button>
                  ) : null
                }
              >
            {request.status === "MLR_APPROVED" && !hasIssuedMlrCode && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Issue MLR code before sending to design.
              </div>
            )}
            {request.status !== "MLR_APPROVED" && !latestDesignJob && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Send to Design is available when the request reaches MLR_APPROVED with a code-issued compliance record.
              </div>
            )}
            {isSendToDesignOpen && request.status === "MLR_APPROVED" && (
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                {designErrorMessage && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {designErrorMessage}
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Source Document
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={sendToDesignForm.source_document_id}
                      onChange={(event) =>
                        setSendToDesignForm((previous) => ({
                          ...previous,
                          source_document_id: event.target.value,
                          source_content_version_id: "",
                        }))
                      }
                      disabled={isSendToDesignOptionsLoading || isDesignActionLoading}
                    >
                      <option value="">Auto-select from request content</option>
                      {documents.map((document) => (
                        <option key={document.id} value={document.id}>
                          {document.document_number} - {document.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Source Content Version
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={sendToDesignForm.source_content_version_id}
                      onChange={(event) =>
                        setSendToDesignForm((previous) => ({
                          ...previous,
                          source_content_version_id: event.target.value,
                        }))
                      }
                      disabled={isDesignActionLoading}
                    >
                      <option value="">Auto-pick latest MLR review</option>
                      {mlrSourceContentVersions.map((version) => (
                        <option key={version.id} value={version.id}>
                          {version.version_label || `V${version.version_number}`} /{" "}
                          {version.asset?.original_filename ?? `Asset ${version.asset_id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Design Agency
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={sendToDesignForm.agency_id}
                      onChange={(event) =>
                        setSendToDesignForm((previous) => ({
                          ...previous,
                          agency_id: event.target.value,
                        }))
                      }
                      disabled={isSendToDesignOptionsLoading || isDesignActionLoading}
                    >
                      <option value="">Select agency</option>
                      {designAgencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assigned Designer
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={sendToDesignForm.assigned_designer_id}
                      onChange={(event) =>
                        setSendToDesignForm((previous) => ({
                          ...previous,
                          assigned_designer_id: event.target.value,
                        }))
                      }
                      disabled={isSendToDesignOptionsLoading || isDesignActionLoading}
                    >
                      <option value="">Optional</option>
                      {availableUsers.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.full_name} ({candidate.email})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Design Coordinator
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={sendToDesignForm.design_coordinator_id}
                      onChange={(event) =>
                        setSendToDesignForm((previous) => ({
                          ...previous,
                          design_coordinator_id: event.target.value,
                        }))
                      }
                      disabled={isSendToDesignOptionsLoading || isDesignActionLoading}
                    >
                      <option value="">Optional</option>
                      {availableUsers.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.full_name} ({candidate.email})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Due Date
                    </span>
                    <input
                      type="date"
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={sendToDesignForm.due_date}
                      onChange={(event) =>
                        setSendToDesignForm((previous) => ({
                          ...previous,
                          due_date: event.target.value,
                        }))
                      }
                      disabled={isDesignActionLoading}
                    />
                  </label>
                </div>

                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Brief
                  </span>
                  <textarea
                    className="block min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={sendToDesignForm.brief}
                    onChange={(event) =>
                      setSendToDesignForm((previous) => ({
                        ...previous,
                        brief: event.target.value,
                      }))
                    }
                    disabled={isDesignActionLoading}
                    placeholder="Design brief and expected output."
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Design Notes
                  </span>
                  <textarea
                    className="block min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={sendToDesignForm.design_notes}
                    onChange={(event) =>
                      setSendToDesignForm((previous) => ({
                        ...previous,
                        design_notes: event.target.value,
                      }))
                    }
                    disabled={isDesignActionLoading}
                    placeholder="Optional execution notes."
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setIsSendToDesignOpen(false);
                      resetSendToDesignForm();
                    }}
                    disabled={isDesignActionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={() => {
                      void handleSendToDesignSubmit();
                    }}
                    disabled={
                      isDesignActionLoading ||
                      !canSendToDesign ||
                      !hasIssuedMlrCode
                    }
                  >
                    Confirm Send To Design
                  </button>
                </div>
              </div>
            )}
              </SummaryCard>

              <DesignJobPanel
                job={latestDesignJob}
                history={designHistory}
                isLoading={isLoading}
                isActionLoading={isDesignActionLoading}
                errorMessage={designErrorMessage}
                canUpload={canUploadDesign}
                canSubmitForReview={canSubmitDesignReview}
                canApprove={canApproveDesign}
                canRequestRevision={canRequestDesignRevision}
                canCancel={canCancelDesign}
                onUpload={handleUploadDesignDraft}
                onSubmitForReview={async (comment) => {
                  await handleTransitionDesignJob("submit_for_review", comment ?? null);
                }}
                onApprove={async (comment) => {
                  await handleTransitionDesignJob("approve_design", comment ?? null);
                }}
                onRequestRevision={async (comment) => {
                  await handleTransitionDesignJob("request_revision", comment ?? null);
                }}
                onCancel={async (comment) => {
                  await handleTransitionDesignJob("cancel", comment ?? null);
                }}
                onDownloadVersion={handleDownloadContentVersion}
              />
            </>
          )}

          {showFinalApprovalSection && (
            <SummaryCard
              title="Final Approval"
              subtitle="Create the final locked approved material after design approval."
              action={
                request.status === "FINAL_APPROVAL" && canGrantFinalApproval ? (
                  <button
                    type="button"
                    disabled={isFinalApprovalSubmitting}
                    onClick={openFinalApprovalModal}
                    className={primaryButtonClass}
                  >
                    Grant Final Approval
                  </button>
                ) : null
              }
            >
            {request.status === "FINAL_APPROVAL" && !canGrantFinalApproval && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You need CAN_FINAL_APPROVE permission to grant final approval.
              </div>
            )}

            {request.status === "FINAL_APPROVAL" && designContentVersions.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No design-stage content version found yet. Upload and approve a design version first.
              </div>
            )}

            {request.status === "FINAL_APPROVAL" && codeIssuedComplianceRecords.length === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No CODE_ISSUED compliance record with MLR code found yet.
              </div>
            )}

            {request.status === "FINAL_APPROVAL" && isFinalApprovalOpen && (
              <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                {finalApprovalErrorMessage && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {finalApprovalErrorMessage}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Material Title
                    </span>
                    <input
                      type="text"
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.material_title}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          material_title: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                      maxLength={255}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Final Content Version
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.final_content_version_id}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          final_content_version_id: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                    >
                      <option value="">Auto-select approved design version</option>
                      {designContentVersions.map((version) => (
                        <option key={version.id} value={version.id}>
                          {version.version_label || `V${version.version_number}`} /{" "}
                          {version.asset?.original_filename ?? `Asset ${version.asset_id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Compliance Record
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.compliance_record_id}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          compliance_record_id: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                    >
                      <option value="">Auto-select latest CODE_ISSUED record</option>
                      {codeIssuedComplianceRecords.map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.mlr_code || "MLR code"} / {record.content_version_label || record.content_version_id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Valid From
                    </span>
                    <input
                      type="date"
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.valid_from}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          valid_from: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Valid Until
                    </span>
                    <input
                      type="date"
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.valid_until}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          valid_until: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Digital Asset
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.digital_asset_id}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          digital_asset_id: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                    >
                      <option value="">Optional</option>
                      {requestAssetOptions.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.original_filename}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Print-ready Asset
                    </span>
                    <select
                      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={finalApprovalForm.print_ready_asset_id}
                      onChange={(event) =>
                        setFinalApprovalForm((previous) => ({
                          ...previous,
                          print_ready_asset_id: event.target.value,
                        }))
                      }
                      disabled={isFinalApprovalSubmitting}
                    >
                      <option value="">Optional</option>
                      {requestAssetOptions.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.original_filename}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Comment
                  </span>
                  <textarea
                    className="block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={finalApprovalForm.comment}
                    onChange={(event) =>
                      setFinalApprovalForm((previous) => ({
                        ...previous,
                        comment: event.target.value,
                      }))
                    }
                    disabled={isFinalApprovalSubmitting}
                    maxLength={2000}
                    placeholder="Optional final approval note."
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setIsFinalApprovalOpen(false);
                      resetFinalApprovalForm();
                    }}
                    disabled={isFinalApprovalSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={() => {
                      void handleFinalApprovalSubmit();
                    }}
                    disabled={isFinalApprovalSubmitting || !canGrantFinalApproval}
                  >
                    Confirm Final Approval
                  </button>
                </div>
              </div>
            )}
            </SummaryCard>
          )}

          {showDistributionSection && (request.status === "FINAL_APPROVED" ||
            request.status === "WITHDRAWN" ||
            approvedMaterial !== null) && (
            <ApprovedMaterialPanel
              material={approvedMaterial}
              history={approvedMaterialHistory}
              errorMessage={approvedMaterialErrorMessage}
              historyErrorMessage={approvedMaterialHistoryErrorMessage}
              canWithdraw={canWithdrawApprovedMaterial}
              isActionLoading={isFinalApprovalSubmitting}
              onWithdraw={handleWithdrawApprovedMaterial}
              action={
                approvedMaterial ? (
                  <Link
                    to={`/approved-materials/${approvedMaterial.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Open Detail
                  </Link>
                ) : null
              }
            />
          )}

          {showMlrReviewSection && (
            <>
              <ContentVersionsSection
                versions={contentVersions}
                errorMessage={contentVersionsErrorMessage}
                title="MLR Review Content"
                subtitle="Submitted and supporting content versions used in MLR review."
                onDownload={handleDownloadContentVersion}
              />

              <ContentViewer
                asset={preferredPreviewAsset}
                contentVersion={preferredComplianceContentVersion}
                annotations={reviewAnnotations}
                selectedAnnotationId={selectedAnnotationId}
                canAnnotate={false}
                onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
                onDownload={handleDownloadViewerAsset}
                title="Review Content Preview"
                subtitle="Read-only preview of the current request-linked review content."
              />

              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      key: "OPEN_MANDATORY",
                      label: "Open Mandatory",
                      count: reviewAnnotations.filter(
                        (annotation) =>
                          annotation.is_mandatory_change &&
                          (annotation.status === "OPEN" || annotation.status === "REOPENED"),
                      ).length,
                    },
                    {
                      key: "OPEN_OPTIONAL",
                      label: "Open Optional",
                      count: reviewAnnotations.filter(
                        (annotation) =>
                          !annotation.is_mandatory_change &&
                          (annotation.status === "OPEN" || annotation.status === "REOPENED"),
                      ).length,
                    },
                    {
                      key: "RESOLVED",
                      label: "Resolved",
                      count: reviewAnnotations.filter((annotation) => annotation.status === "RESOLVED").length,
                    },
                    {
                      key: "DISMISSED",
                      label: "Dismissed",
                      count: reviewAnnotations.filter((annotation) => annotation.status === "DISMISSED").length,
                    },
                    {
                      key: "ALL",
                      label: "All",
                      count: reviewAnnotations.length,
                    },
                  ].map((filter) => {
                    const isActive = annotationFilter === (filter.key as AnnotationViewFilter);
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setAnnotationFilter(filter.key as AnnotationViewFilter)}
                        className={[
                          annotationFilterButtonClass,
                          isActive
                            ? "border-brand-700 bg-brand-50 text-brand-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                        ].join(" ")}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <ReviewAnnotationsPanel
                annotations={filteredReviewAnnotations}
                isLoading={isAnnotationLoading}
                errorMessage={annotationErrorMessage}
                title="MLR Review Comments"
                subtitle="Structured MLR comments across submitted review content."
                selectedAnnotationId={selectedAnnotationId}
                canResolve={isAdmin || isRequester || hasPermission(PERMISSIONS.RESOLVE_REVIEW_ANNOTATION)}
                canDismiss={isAdmin || isRequester || hasPermission(PERMISSIONS.RESOLVE_REVIEW_ANNOTATION)}
                canReopen={isAdmin || hasPermission(PERMISSIONS.ADD_REVIEW_ANNOTATION) || reviewAnnotations.some((annotation) => annotation.reviewer_id === user?.id)}
                onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
                onResolve={handleResolveAnnotation}
                onReopen={handleReopenAnnotation}
                onDismiss={handleDismissAnnotation}
              />
            </>
          )}

          {showComplianceSection && (
            <ComplianceRecordPanel
              record={currentComplianceRecord}
              contentVersionId={preferredComplianceContentVersion?.id ?? null}
              isLoading={isComplianceLoading}
              errorMessage={complianceErrorMessage}
              title="Compliance / MLR Code"
              subtitle="Compliance checklist and MLR code issuance for request-linked review content."
              canCreate={canUpdateCompliance}
              canEditChecklist={canUpdateCompliance}
              canIssueCode={canIssueCompliance}
              onCreate={async () => {
                await handleCreateComplianceRecord();
              }}
              onSave={handleSaveCompliance}
              onIssueCode={handleIssueComplianceCode}
            />
          )}
        </div>

        <div className="space-y-6">
          <div id="active-stage-panel">
            <ActionPanel
              request={request}
              documents={documents}
              masterData={requestMasterData}
              latestOpenRevisionCycle={latestOpenRevisionCycle}
              isActionLoading={isActionLoading}
              canSubmit={
                (request.status === "RETURNED_TO_SPOC" || request.status === "SPOC_REVISION_IN_PROGRESS"
                  ? canUseAction("RESUBMIT_TO_REGIONAL") || canUseAction("RESUBMIT_CONTENT_REQUEST")
                  : canUseAction("SUBMIT_CONTENT_REQUEST")) &&
                (isAdmin || isRequester || hasPermission(PERMISSIONS.SUBMIT_CONTENT_REQUEST))
              }
              canRegionalEvaluate={canRegionalEvaluate}
              canApproveRouteRegional={canApproveRouteRegional}
              canRequestModification={canRequestModification}
              canRegionalEdit={canRegionalEdit}
              canReturnWithRegionalEdits={canReturnWithRegionalEdits}
              canRejectRegional={canRejectRegional}
              canDeferRegional={canDeferRegional}
              canMergeRegional={canMergeRegional}
              canSpocAcceptRegionalEdits={canSpocAcceptRegionalEdits}
              canSpocResubmitAfterRegionalEdits={canSpocResubmitAfterRegionalEdits}
              canStartTherapyDraft={canStartTherapyDraft}
              canCreateContentWorkspace={canCreateContentWorkspace}
              canCreateDraftVersion={canCreateDraftVersion}
              canSubmitMedicalReview={canSubmitMedicalReview}
              canContinueMedicalReview={canContinueMedicalReview}
              canStartMedicalRevision={canStartMedicalRevision}
              canResubmitMedicalReview={canResubmitMedicalReview}
              isAssignedTherapyLead={isAssignedTherapyLead}
              isAssignedDesigner={isAssignedDesigner}
              canReviewDesignDraft={canReviewDesignDraft}
              medicalRevisionContext={medicalRevisionContext}
              medicalRevisionContextErrorMessage={medicalRevisionContextErrorMessage}
              draftVersions={workspaceDraftVersions}
              currentDraftVersion={currentDraftVersion}
              canTherapyReview={isAdmin || hasPermission(PERMISSIONS.UPDATE_REQUEST)}
              canMarketingReview={isAdmin || hasPermission(PERMISSIONS.UPDATE_REQUEST)}
              canWithdraw={isAdmin || isRequester}
              onPromptComment={promptComment}
              onAction={runAction}
              onRegionalAction={runRegionalAction}
              onAcceptRegionalEdits={runAcceptRegionalEdits}
              onStartTherapyDraftCreation={runStartTherapyDraftCreation}
              onStartMedicalRevision={runStartMedicalRevision}
              onCreateContentWorkspace={runCreateContentWorkspace}
              onOpenDraftVersionModal={openDraftVersionModal}
              onOpenMedicalSubmitModal={openMedicalSubmitModal}
              onOpenMedicalRevisionResubmitModal={openMedicalRevisionResubmitModal}
              onDownloadContentVersion={handleDownloadContentVersion}
            />
          </div>
        </div>
      </div>

      {isDraftVersionModalOpen && primaryContentWorkspace && (
        <DraftVersionModal
          workspaceTitle={primaryContentWorkspace.title}
          form={draftVersionForm}
          file={draftVersionFile}
          errorMessage={draftVersionErrorMessage}
          isSubmitting={isActionLoading}
          onChange={setDraftVersionForm}
          onFileChange={setDraftVersionFile}
          onClose={() => setIsDraftVersionModalOpen(false)}
          onSubmit={handleCreateDraftVersion}
        />
      )}

      {isMedicalSubmitModalOpen && (
        <SubmitMedicalReviewModal
          request={request}
          workspace={primaryContentWorkspace}
          version={currentDraftVersion ?? request.current_draft_version ?? null}
          notes={medicalSubmitNotes}
          errorMessage={medicalSubmitErrorMessage}
          isSubmitting={isActionLoading}
          onNotesChange={setMedicalSubmitNotes}
          onClose={() => setIsMedicalSubmitModalOpen(false)}
          onSubmit={handleSubmitMedicalReview}
        />
      )}

      {isMedicalRevisionResubmitModalOpen && (
        <SubmitMedicalRevisionModal
          request={request}
          workspace={primaryContentWorkspace}
          version={currentDraftVersion ?? request.current_draft_version ?? null}
          context={medicalRevisionContext}
          notes={medicalRevisionResubmitNotes}
          addressedSummary={medicalRevisionAddressedSummary}
          errorMessage={medicalRevisionResubmitErrorMessage}
          isSubmitting={isActionLoading}
          onNotesChange={setMedicalRevisionResubmitNotes}
          onAddressedSummaryChange={setMedicalRevisionAddressedSummary}
          onClose={() => setIsMedicalRevisionResubmitModalOpen(false)}
          onSubmit={handleResubmitMedicalReview}
        />
      )}

      <ReferenceMaterialViewer
        requestId={request.id}
        material={selectedReferenceMaterial}
        onClose={() => setSelectedReferenceMaterial(null)}
      />

      <BottomDrawer title="Request Activity" tabs={bottomDrawerTabs} />
    </PageContainer>
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
            <h2 className="text-lg font-semibold text-slate-950">Create Draft Version</h2>
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
            Save Draft Version
          </button>
        </div>
      </div>
    </div>
  );
}


function medicalRoutingConfigured(request: MaterialRequest): boolean {
  const readiness = request.medical_submission_readiness;
  return Boolean(readiness?.has_medical_reviewer_assignment ?? readiness?.medical_assignment_configured);
}


function medicalReviewerDisplay(request: MaterialRequest): string {
  const assignment = request.medical_submission_readiness?.medical_reviewer_assignment;
  if (!assignment?.assignment_found) {
    return "Not configured";
  }
  if (assignment.display_name) {
    return assignment.display_name;
  }
  if (assignment.assigned_user?.full_name) {
    return assignment.assigned_user.full_name;
  }
  if (assignment.assigned_group?.name) {
    return assignment.assigned_group.name;
  }
  if (assignment.assigned_user_id) {
    return `User ${assignment.assigned_user_id}`;
  }
  if (assignment.assigned_group_id) {
    return `Group ${assignment.assigned_group_id}`;
  }
  return "Configured";
}


function versionDisplay(
  version: Pick<ContentVersion, "version_number" | "version_label"> | ContentWorkspaceCurrentVersion | null,
): string {
  if (!version) {
    return "Not set";
  }
  const versionNumber = `V${version.version_number}`;
  return version.version_label ? `${versionNumber} / ${version.version_label}` : versionNumber;
}


type ReadinessItemProps = {
  label: string;
  isComplete: boolean;
  completeLabel: string;
  missingLabel: string;
};


function ReadinessItem({ label, isComplete, completeLabel, missingLabel }: ReadinessItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={isComplete ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
        {isComplete ? completeLabel : missingLabel}
      </span>
    </div>
  );
}


function MedicalReadinessChecklist({ request }: { request: MaterialRequest }) {
  const readiness = request.medical_submission_readiness;
  const hasWorkspace = Boolean(readiness?.has_content_workspace ?? request.has_content_workspace);
  const hasDraftVersion = Boolean(readiness?.has_current_draft_version ?? request.current_draft_version);
  const alignmentComplete = Boolean(
    readiness?.therapy_alignment_completed ?? request.therapy_alignment_status === "COMPLETED",
  );
  const hasRouting = medicalRoutingConfigured(request);
  const hasPermission = Boolean(readiness?.can_submit_medical_review_permission);

  return (
    <div className="grid gap-2">
      <ReadinessItem label="Content Dashboard" isComplete={hasWorkspace} completeLabel="Complete" missingLabel="Missing" />
      <ReadinessItem label="Current Draft Version" isComplete={hasDraftVersion} completeLabel="Complete" missingLabel="Missing" />
      <ReadinessItem label="Therapy Alignment" isComplete={alignmentComplete} completeLabel="Complete" missingLabel="Pending" />
      <ReadinessItem label="Medical Reviewer Routing" isComplete={hasRouting} completeLabel="Configured" missingLabel="Missing" />
      <ReadinessItem label="Permission" isComplete={hasPermission} completeLabel="Allowed" missingLabel="Missing" />
    </div>
  );
}


type SubmitMedicalReviewPanelProps = {
  request: MaterialRequest;
  isActionLoading: boolean;
  canSubmitMedicalReview: boolean;
  onOpen: () => void;
};


function SubmitMedicalReviewPanel({
  request,
  isActionLoading,
  canSubmitMedicalReview,
  onOpen,
}: SubmitMedicalReviewPanelProps) {
  const blockingReasons = request.medical_submission_readiness?.blocking_reasons ?? [];

  return (
    <div className="space-y-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <div>
        <p className="font-semibold text-sky-950">Submit to Medical Review</p>
        <p className="mt-1">
          Send the current Therapy Lead draft version to the Medical team for pre-MLR review.
        </p>
      </div>
      <MedicalReadinessChecklist request={request} />
      {blockingReasons.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {blockingReasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}
      <button
        type="button"
        className={["w-full", primaryButtonClass].join(" ")}
        disabled={!canSubmitMedicalReview || isActionLoading}
        onClick={onOpen}
      >
        Submit to Medical Review
      </button>
    </div>
  );
}


type SubmitMedicalReviewModalProps = {
  request: MaterialRequest;
  workspace: ContentWorkspaceSummary | null;
  version: ContentVersion | ContentWorkspaceCurrentVersion | null;
  notes: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};


function SubmitMedicalReviewModal({
  request,
  workspace,
  version,
  notes,
  errorMessage,
  isSubmitting,
  onNotesChange,
  onClose,
  onSubmit,
}: SubmitMedicalReviewModalProps) {
  const canSubmit = Boolean(request.medical_submission_readiness?.can_submit_medical_review);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Submit Draft to Medical Review</h2>
            <p className="mt-1 text-sm text-slate-500">
              {request.request_number ?? "Content request"} / {request.title ?? "Untitled request"}
            </p>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Close
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailRow
            label="Content Dashboard"
            value={workspace ? `${workspace.document_number ?? workspace.content_code} / ${workspace.title}` : "Not set"}
          />
          <DetailRow label="Current Draft Version" value={versionDisplay(version)} />
          <DetailRow label="Medical Reviewer / Team" value={medicalReviewerDisplay(request)} />
          <DetailRow label="Next Action" value="Medical Content Review" />
        </dl>

        <div className="mt-4">
          <MedicalReadinessChecklist request={request} />
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submission Notes</span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            disabled={isSubmitting}
            rows={4}
            maxLength={5000}
            className="mt-2 block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Optional context for Medical Review."
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
            Submit to Medical Review
          </button>
        </div>
      </div>
    </div>
  );
}


type SubmitMedicalRevisionModalProps = {
  request: MaterialRequest;
  workspace: ContentWorkspaceSummary | null;
  version: ContentVersion | ContentWorkspaceCurrentVersion | null;
  context: MedicalRevisionContext | null;
  notes: string;
  addressedSummary: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onNotesChange: (value: string) => void;
  onAddressedSummaryChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};


function SubmitMedicalRevisionModal({
  request,
  workspace,
  version,
  context,
  notes,
  addressedSummary,
  errorMessage,
  isSubmitting,
  onNotesChange,
  onAddressedSummaryChange,
  onClose,
  onSubmit,
}: SubmitMedicalRevisionModalProps) {
  const canSubmit = Boolean(context?.can_resubmit_medical_review);
  const assignment = context?.medical_reviewer_assignment ?? request.medical_submission_readiness?.medical_reviewer_assignment ?? null;
  const reviewerLabel =
    assignment?.display_name ||
    assignment?.assigned_user?.full_name ||
    assignment?.assigned_group?.name ||
    (assignment?.assigned_user_id ? `User ${assignment.assigned_user_id}` : null) ||
    (assignment?.assigned_group_id ? `Group ${assignment.assigned_group_id}` : null) ||
    medicalReviewerDisplay(request);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Resubmit to Medical Review</h2>
            <p className="mt-1 text-sm text-slate-500">
              {request.request_number ?? "Content request"} / {request.title ?? "Untitled request"}
            </p>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Close
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailRow label="Content Dashboard" value={workspace ? `${workspace.document_number} / ${workspace.title}` : "Not set"} />
          <DetailRow label="Current Revised Version" value={versionDisplay(version)} />
          <DetailRow label="Medical Reviewer / Team" value={reviewerLabel} />
          <DetailRow label="Open Mandatory Comments" value={context?.open_mandatory_comments.length ?? 0} />
          <DetailRow label="Reference Issues" value={context?.reference_issues.length ?? 0} />
          <DetailRow label="Previous Medical Version" value={versionDisplay(context?.medical_reviewed_version ?? null)} />
        </dl>

        {context?.blocking_reasons?.length ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {context.blocking_reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        ) : null}

        <label className="mt-4 block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resubmission Notes</span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            disabled={isSubmitting}
            rows={4}
            maxLength={5000}
            className="mt-2 block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Summarize what changed in this revised draft."
          />
        </label>

        <label className="mt-4 block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Addressed Comments Summary</span>
          <textarea
            value={addressedSummary}
            onChange={(event) => onAddressedSummaryChange(event.target.value)}
            disabled={isSubmitting}
            rows={3}
            maxLength={5000}
            className="mt-2 block min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Optional summary of Medical comments addressed."
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
            Resubmit to Medical Review
          </button>
        </div>
      </div>
    </div>
  );
}


function taskMetadataString(task: WorkflowTaskSummary | null, key: string): string | null {
  const value = task?.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}


type MedicalReviewPanelProps = {
  request: MaterialRequest;
  workspace: ContentWorkspaceSummary | null;
  submittedVersion: ContentWorkspaceCurrentVersion | null;
  currentDraftVersion: ContentVersion | null;
  task: WorkflowTaskSummary | null;
  medicalRevisionContext: MedicalRevisionContext | null;
  medicalRevisionContextErrorMessage: string | null;
  canStartMedicalRevision: boolean;
  canReviewMedicalContent: boolean;
  canContinueMedicalReview: boolean;
  onStartMedicalRevision: () => void;
  onDownloadContentVersion: (version: ContentVersion) => void;
};


function MedicalReviewPanel({
  request,
  workspace,
  submittedVersion,
  currentDraftVersion,
  task,
  medicalRevisionContext,
  medicalRevisionContextErrorMessage,
  canStartMedicalRevision,
  canReviewMedicalContent,
  canContinueMedicalReview,
  onStartMedicalRevision,
  onDownloadContentVersion,
}: MedicalReviewPanelProps) {
  const submittedAt = taskMetadataString(task, "submitted_at");
  const submissionNotes = taskMetadataString(task, "submission_notes");
  const matchingDraftVersion =
    currentDraftVersion && (!submittedVersion || currentDraftVersion.id === submittedVersion.id)
      ? currentDraftVersion
      : null;
  const therapyRevisionTask = request.therapy_medical_revision_task ?? null;
  const openMandatoryCount = medicalRevisionContext?.open_mandatory_comments.length ?? therapyRevisionTask?.metadata?.open_mandatory_comment_count;
  const referenceIssueCount = medicalRevisionContext?.reference_issues.length ?? therapyRevisionTask?.metadata?.reference_issue_count;
  const revisionRequiredOrInProgress = ["MEDICAL_REVISION_REQUIRED", "MEDICAL_REVISION_IN_PROGRESS"].includes(request.status);

  return (
    <SummaryCard
      title="Medical Content Review"
      subtitle="Read-only context for the submitted Therapy Lead draft."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailRow label="Task Status" value={task ? <StatusBadge status={task.status} /> : "No task found"} />
          <DetailRow label="Due Date" value={task?.due_at ? formatDateTime(task.due_at) : "Not set"} />
          <DetailRow
            label="Assigned Reviewer / Team"
            value={
              task?.assigned_user_id
                ? `User ${task.assigned_user_id}`
                : task?.assigned_group_id
                  ? `Group ${task.assigned_group_id}`
                  : medicalReviewerDisplay(request)
            }
          />
          <DetailRow label="Submitted At" value={submittedAt ? formatDateTime(submittedAt) : "Not set"} />
        </div>

        {workspace && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{workspace.document_number}</p>
            <p className="mt-1">{workspace.title}</p>
          </div>
        )}

        {matchingDraftVersion ? (
          <DraftVersionCard version={matchingDraftVersion} onDownload={onDownloadContentVersion} />
        ) : (
          <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{versionDisplay(submittedVersion)}</p>
                <p className="mt-1">Submitted draft version</p>
              </div>
              {submittedVersion?.status && <StatusBadge status={submittedVersion.status} />}
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Content Stage" value={submittedVersion?.content_stage ?? "Draft"} />
              <DetailRow label="Created At" value={submittedVersion?.created_at ? formatDateTime(submittedVersion.created_at) : "Not set"} />
              <DetailRow label="Draft Notes" value={submittedVersion?.draft_notes || "Not provided"} />
              <DetailRow label="Change Summary" value={submittedVersion?.change_summary || "Not provided"} />
            </dl>
          </div>
        )}

        {submissionNotes && <DetailBlock title="Submission Notes" value={submissionNotes} />}

        {request.status === "MEDICAL_CONTENT_APPROVED" && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="font-semibold text-emerald-950">Medical Content Approved</p>
              <StatusBadge status={request.status} />
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Approved By" value={request.medical_approved_by?.full_name ?? (request.medical_approved_by_id ? `User ${request.medical_approved_by_id}` : "Not set")} />
              <DetailRow label="Approved At" value={request.medical_approved_at ? formatDateTime(request.medical_approved_at) : "Not set"} />
              <DetailRow label="Decision Notes" value={request.medical_decision_notes || "Not provided"} />
              <DetailRow label="Next Action" value="Create Design Brief" />
            </dl>
          </div>
        )}

        {revisionRequiredOrInProgress && (
          <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="font-semibold text-orange-950">
                {request.status === "MEDICAL_REVISION_IN_PROGRESS" ? "Medical Revision In Progress" : "Medical Revision Required"}
              </p>
              <StatusBadge status={request.status} />
            </div>
            {medicalRevisionContextErrorMessage && (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {medicalRevisionContextErrorMessage}
              </div>
            )}
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Requested By" value={request.medical_revision_requested_by?.full_name ?? (request.medical_revision_requested_by_id ? `User ${request.medical_revision_requested_by_id}` : "Not set")} />
              <DetailRow label="Requested At" value={request.medical_revision_requested_at ? formatDateTime(request.medical_revision_requested_at) : "Not set"} />
              <DetailRow label="Reason" value={request.medical_revision_reason ? getStatusLabel(request.medical_revision_reason) : "Not set"} />
              <DetailRow label="Notes" value={request.medical_revision_notes || "Not provided"} />
              <DetailRow label="Open Mandatory Comments" value={typeof openMandatoryCount === "number" ? openMandatoryCount : "Not set"} />
              <DetailRow label="Assigned Therapy Lead" value={request.assigned_therapy_lead?.full_name ?? (request.assigned_therapy_lead_id ? `User ${request.assigned_therapy_lead_id}` : "Not set")} />
              <DetailRow label="Revision Task" value={therapyRevisionTask ? <StatusBadge status={therapyRevisionTask.status} /> : "Not created"} />
              <DetailRow label="Next Action" value="Revise Draft Based on Medical Feedback" />
              <DetailRow label="Reference Issues" value={typeof referenceIssueCount === "number" ? referenceIssueCount : "Not set"} />
            </dl>
            {medicalRevisionContext && (
              <MedicalFeedbackSummary context={medicalRevisionContext} />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {request.status === "MEDICAL_REVISION_REQUIRED" && (
                <button
                  type="button"
                  className={primaryButtonClass}
                  disabled={!canStartMedicalRevision}
                  onClick={onStartMedicalRevision}
                >
                  Start Medical Revision
                </button>
              )}
              <Link to={`/requests/${request.id}/medical-review`} className={secondaryButtonClass}>
                Open Medical Feedback
              </Link>
            </div>
          </div>
        )}

        {!["MEDICAL_CONTENT_APPROVED", "MEDICAL_REVISION_REQUIRED", "MEDICAL_REVISION_IN_PROGRESS"].includes(request.status) && (
          <div className="flex flex-col gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {canReviewMedicalContent
                ? "Medical Review task is ready for the assigned reviewer."
                : "Medical Content Review is active for the assigned Medical Reviewer."}
            </p>
            {canContinueMedicalReview && (
              <Link to={`/requests/${request.id}/medical-review`} className={primaryButtonClass}>
                Continue Medical Review
              </Link>
            )}
          </div>
        )}
      </div>
    </SummaryCard>
  );
}


function MedicalFeedbackSummary({ context }: { context: MedicalRevisionContext }) {
  return (
    <div className="mt-4 space-y-3 rounded-md border border-white/70 bg-white/70 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <ReadinessItem
          label="Mandatory Comments"
          isComplete={context.open_mandatory_comments.length === 0}
          completeLabel="None open"
          missingLabel={`${context.open_mandatory_comments.length} open`}
        />
        <ReadinessItem
          label="Optional Comments"
          isComplete={context.optional_comments.length === 0}
          completeLabel="None"
          missingLabel={`${context.optional_comments.length} noted`}
        />
        <ReadinessItem
          label="Reference Issues"
          isComplete={context.reference_issues.length === 0}
          completeLabel="None"
          missingLabel={`${context.reference_issues.length} open`}
        />
      </div>
      {context.open_mandatory_comments.slice(0, 3).map((comment) => (
        <div key={comment.id} className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          <p className="font-semibold">{getStatusLabel(comment.comment_category)} / {getStatusLabel(comment.severity)}</p>
          <p className="mt-1">{comment.comment_text}</p>
        </div>
      ))}
      {context.reference_issues.slice(0, 2).map((issue) => (
        <div key={issue.id} className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">Reference issue</p>
          <p className="mt-1">{issue.claim_text || issue.reference_note || issue.validation_notes || "Replacement reference required."}</p>
        </div>
      ))}
    </div>
  );
}


type ActionPanelProps = {
  request: MaterialRequest;
  documents: LinkedDocument[];
  masterData: MaterialRequestMasterData;
  latestOpenRevisionCycle: ContentRequestRevisionCycle | null;
  isActionLoading: boolean;
  canSubmit: boolean;
  canRegionalEvaluate: boolean;
  canApproveRouteRegional: boolean;
  canRequestModification: boolean;
  canRegionalEdit: boolean;
  canReturnWithRegionalEdits: boolean;
  canRejectRegional: boolean;
  canDeferRegional: boolean;
  canMergeRegional: boolean;
  canSpocAcceptRegionalEdits: boolean;
  canSpocResubmitAfterRegionalEdits: boolean;
  canStartTherapyDraft: boolean;
  canCreateContentWorkspace: boolean;
  canCreateDraftVersion: boolean;
  canSubmitMedicalReview: boolean;
  canContinueMedicalReview: boolean;
  canStartMedicalRevision: boolean;
  canResubmitMedicalReview: boolean;
  isAssignedTherapyLead: boolean;
  isAssignedDesigner: boolean;
  canReviewDesignDraft: boolean;
  medicalRevisionContext: MedicalRevisionContext | null;
  medicalRevisionContextErrorMessage: string | null;
  draftVersions: ContentVersion[];
  currentDraftVersion: ContentVersion | null;
  canTherapyReview: boolean;
  canMarketingReview: boolean;
  canWithdraw: boolean;
  onPromptComment: (message: string) => string | null;
  onAction: (
    action: MaterialRequestTransitionAction,
    options: ActionOptions,
  ) => void;
  onRegionalAction: (
    action: RegionalActionKind,
    payload: RegionalActionPayload,
    successMessage: string,
  ) => void;
  onAcceptRegionalEdits: () => void;
  onStartTherapyDraftCreation: () => void;
  onStartMedicalRevision: () => void;
  onCreateContentWorkspace: () => void;
  onOpenDraftVersionModal: () => void;
  onOpenMedicalSubmitModal: () => void;
  onOpenMedicalRevisionResubmitModal: () => void;
  onDownloadContentVersion: (version: ContentVersion) => void;
};


function ActionPanel({
  request,
  documents,
  masterData,
  latestOpenRevisionCycle,
  isActionLoading,
  canSubmit,
  canRegionalEvaluate,
  canApproveRouteRegional,
  canRequestModification,
  canRegionalEdit,
  canReturnWithRegionalEdits,
  canRejectRegional,
  canDeferRegional,
  canMergeRegional,
  canSpocAcceptRegionalEdits,
  canSpocResubmitAfterRegionalEdits,
  canStartTherapyDraft,
  canCreateContentWorkspace,
  canCreateDraftVersion,
  canSubmitMedicalReview,
  canContinueMedicalReview,
  canStartMedicalRevision,
  canResubmitMedicalReview,
  isAssignedTherapyLead,
  isAssignedDesigner,
  canReviewDesignDraft,
  medicalRevisionContext,
  medicalRevisionContextErrorMessage,
  draftVersions,
  currentDraftVersion,
  canTherapyReview,
  canMarketingReview,
  canWithdraw,
  onPromptComment,
  onAction,
  onRegionalAction,
  onAcceptRegionalEdits,
  onStartTherapyDraftCreation,
  onStartMedicalRevision,
  onCreateContentWorkspace,
  onOpenDraftVersionModal,
  onOpenMedicalSubmitModal,
  onOpenMedicalRevisionResubmitModal,
  onDownloadContentVersion,
}: ActionPanelProps) {
  const status = request.status;
  const readyLinkedDocuments = documents.filter((document) => document.status === "READY_FOR_REVIEW");
  const referenceMaterials = request.reference_materials ?? [];
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    return_reason_code: "",
    return_notes: "",
    required_corrections: [] as string[],
    return_attachment_ids: [] as number[],
  });
  const [returnFormError, setReturnFormError] = useState<string | null>(null);
  const [isRegionalEditModalOpen, setIsRegionalEditModalOpen] = useState(false);
  const [regionalEditValues, setRegionalEditValues] = useState<Record<string, string>>({});
  const [regionalEditReturnForm, setRegionalEditReturnForm] = useState({
    reason_category: "",
    return_notes: "",
    required_corrections: [] as string[],
  });
  const [regionalEditFormError, setRegionalEditFormError] = useState<string | null>(null);
  const [spocResponseNotes, setSpocResponseNotes] = useState("");
  const [spocAttachmentIds, setSpocAttachmentIds] = useState<number[]>([]);
  const [spocResponseError, setSpocResponseError] = useState<string | null>(null);

  function requestChanges(action: MaterialRequestTransitionAction, message: string, successMessage: string) {
    const comment = onPromptComment("Change request comment");
    if (comment === null) {
      return;
    }

    onAction(action, { comment: comment || message, successMessage });
  }

  function reject() {
    const comment = onPromptComment("Rejection comment");
    if (comment === null) {
      return;
    }

    onAction("reject", {
      comment,
      confirmMessage: `Reject ${request.request_number ?? "this content request"}?`,
      successMessage: "Content request rejected.",
    });
  }

  function regionalReason(action: RegionalActionKind, prompt: string, successMessage: string) {
    const reason = onPromptComment(prompt);
    if (!reason) {
      return;
    }
    onRegionalAction(action, { reason }, successMessage);
  }

  function toggleReturnCorrection(correction: string) {
    setReturnForm((current) => ({
      ...current,
      required_corrections: current.required_corrections.includes(correction)
        ? current.required_corrections.filter((item) => item !== correction)
        : [...current.required_corrections, correction],
    }));
  }

  function toggleReturnAttachment(materialId: number) {
    setReturnForm((current) => ({
      ...current,
      return_attachment_ids: current.return_attachment_ids.includes(materialId)
        ? current.return_attachment_ids.filter((item) => item !== materialId)
        : [...current.return_attachment_ids, materialId],
    }));
  }

  function toggleSpocAttachment(materialId: number) {
    setSpocAttachmentIds((current) =>
      current.includes(materialId)
        ? current.filter((item) => item !== materialId)
        : [...current, materialId],
    );
  }

  function openReturnModal() {
    setReturnForm({
      return_reason_code: "",
      return_notes: "",
      required_corrections: [],
      return_attachment_ids: [],
    });
    setReturnFormError(null);
    setIsReturnModalOpen(true);
  }

  function submitReturnModal() {
    const notes = returnForm.return_notes.trim();
    if (!returnForm.return_reason_code) {
      setReturnFormError("Select a reason category.");
      return;
    }
    if (notes.length < 20) {
      setReturnFormError("Return notes must be at least 20 characters.");
      return;
    }
    const reason = revisionReasonOptions.find((option) => option.value === returnForm.return_reason_code);
    onRegionalAction(
      "request-modification",
      {
        return_reason_code: returnForm.return_reason_code,
        return_reason_label: reason?.label ?? null,
        return_notes: notes,
        required_corrections: returnForm.required_corrections,
        return_attachment_ids: returnForm.return_attachment_ids,
      },
      "Returned to SPOC for modification.",
    );
    setIsReturnModalOpen(false);
  }

  function openRegionalEditModal() {
    setRegionalEditValues(
      Object.fromEntries(regionalEditableFields.map((field) => [field.key, field.getValue(request)])),
    );
    setRegionalEditReturnForm({
      reason_category: "",
      return_notes: "",
      required_corrections: [],
    });
    setRegionalEditFormError(null);
    setIsRegionalEditModalOpen(true);
  }

  function toggleRegionalEditCorrection(correction: string) {
    setRegionalEditReturnForm((current) => ({
      ...current,
      required_corrections: current.required_corrections.includes(correction)
        ? current.required_corrections.filter((item) => item !== correction)
        : [...current.required_corrections, correction],
    }));
  }

  function changedRegionalEditFields() {
    const changedFields: Record<string, unknown> = {};
    for (const field of regionalEditableFields) {
      const oldValue = field.getValue(request).trim();
      const newValue = (regionalEditValues[field.key] ?? "").trim();
      if (newValue !== oldValue) {
        changedFields[field.key] = newValue || null;
      }
    }
    return changedFields;
  }

  function toggleRegionalMultiselectValue(fieldKey: string, optionValue: string) {
    setRegionalEditValues((current) => {
      const selected = normalizeRegionalIdValues(current[fieldKey]);
      const nextSelected = selected.includes(optionValue)
        ? selected.filter((item) => item !== optionValue)
        : [...selected, optionValue];
      return {
        ...current,
        [fieldKey]: nextSelected.join(", "),
      };
    });
  }

  function submitRegionalEditReturn() {
    const notes = regionalEditReturnForm.return_notes.trim();
    if (!regionalEditReturnForm.reason_category) {
      setRegionalEditFormError("Select a reason category.");
      return;
    }
    if (!notes) {
      setRegionalEditFormError("Return notes are required.");
      return;
    }
    const editedFields = changedRegionalEditFields();
    onRegionalAction(
      "return-with-edits",
      {
        edited_fields: editedFields,
        return_reason_code: regionalEditReturnForm.reason_category,
        return_notes: notes,
        required_corrections: regionalEditReturnForm.required_corrections,
      },
      "Regional edits returned to Country SPOC.",
    );
    setIsRegionalEditModalOpen(false);
  }

  function submitSpocResponse() {
    const notes = spocResponseNotes.trim();
    if (latestOpenRevisionCycle && !notes) {
      setSpocResponseError("SPOC correction response is required.");
      return;
    }
    setSpocResponseError(null);
    onAction("submit", {
      successMessage: "Resubmitted to Regional Marketing.",
      spoc_response_notes: latestOpenRevisionCycle ? notes : null,
      spoc_attachment_ids: spocAttachmentIds,
    });
  }

  function deferRegional() {
    const defer_reason = onPromptComment("Defer reason");
    if (!defer_reason) {
      return;
    }
    const defer_until = window.prompt("Defer until date (YYYY-MM-DD)");
    if (!defer_until) {
      return;
    }
    onRegionalAction("defer", { defer_reason, defer_until }, "Content request deferred.");
  }

  function mergeRegional() {
    const merged_into_request_id = window.prompt("Merge into content request ID");
    if (!merged_into_request_id) {
      return;
    }
    const reason = onPromptComment("Merge reason");
    if (!reason) {
      return;
    }
    onRegionalAction("merge", { merged_into_request_id, reason }, "Content request merged.");
  }

  const showRegionalPanel = [
    "SUBMITTED",
    "SUBMITTED_PENDING_REGIONAL_REVIEW",
    "RESUBMITTED",
    "RESUBMITTED_PENDING_REGIONAL_REVIEW",
    "UNDER_REGIONAL_REVIEW",
  ].includes(status) && request.ui_visibility?.active_stage_code !== "THERAPY_LEAD_DRAFT_CREATION";
  const showTherapyLeadPanel = request.ui_visibility?.active_stage_code
    ? request.ui_visibility.active_stage_code === "THERAPY_LEAD_DRAFT_CREATION"
    : ["APPROVED_ASSIGNED_TO_THERAPY_LEAD", "DRAFT_IN_PROGRESS", "DRAFT_VERSION_READY", "MEDICAL_REVISION_REQUIRED", "MEDICAL_REVISION_IN_PROGRESS"].includes(status);
  const showContentWorkspacePanel = canShowRequestPanel(request, "CONTENT_WORKSPACE");
  const showDraftVersionsPanel = canShowRequestPanel(request, "DRAFT_VERSIONS");
  const showAuthoringStudioLink = canShowRequestPanel(request, "AUTHORING_STUDIO");
  const canReturnToSpocFromStatus = ["SUBMITTED_PENDING_REGIONAL_REVIEW", "RESUBMITTED_PENDING_REGIONAL_REVIEW", "UNDER_REGIONAL_REVIEW"].includes(status);
  const primaryWorkspace = request.primary_content_workspace ?? request.linked_content_workspaces?.[0] ?? null;
  const therapyAlignmentCompleted =
    request.medical_submission_readiness?.therapy_alignment_completed ??
    request.therapy_alignment_status === "COMPLETED";
  const activePanelTitle =
    status === "MEDICAL_REVISION_REQUIRED"
      ? "Medical Revision Required"
      : status === "MEDICAL_REVISION_IN_PROGRESS"
        ? currentDraftVersion?.status === "DRAFT"
          ? "Resubmit to Medical Review"
          : "Create Revised Draft Version"
        : ["DRAFT_IN_PROGRESS", "DRAFT_VERSION_READY"].includes(status)
          ? primaryWorkspace
            ? currentDraftVersion
              ? therapyAlignmentCompleted
                ? "Submit to Medical Review"
                : "Complete Therapy Alignment"
              : "Create Draft Version"
            : "Content Dashboard"
        : medicalReviewNavigationStatuses.includes(status)
          ? "Medical Content Review"
          : "Active Stage Panel";
  const regionalEditChangedFields = changedRegionalEditFields();
  const regionalEditChangedCount = Object.keys(regionalEditChangedFields).length;

  return (
    <SummaryCard title={activePanelTitle}>
      <div className="space-y-3">
        {status === "DRAFT" && (
          <ActionButton
            disabled={!canSubmit || isActionLoading}
            className={primaryButtonClass}
            onClick={() => onAction("submit", { successMessage: "Content request submitted for regional evaluation." })}
          >
            Submit Content Request
          </ActionButton>
        )}

        {(status === "RETURNED_TO_SPOC" || status === "SPOC_REVISION_IN_PROGRESS") && (
          <div className="space-y-3">
            {amendmentFieldChanges(request.active_regional_amendment).length > 0 && (
              <ActionButton
                disabled={!canSpocAcceptRegionalEdits || isActionLoading}
                className={primaryButtonClass}
                onClick={onAcceptRegionalEdits}
              >
                Accept Regional Edits
              </ActionButton>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Link to={`/requests/${request.id}/edit`} className={secondaryButtonClass}>
                Edit Request
              </Link>
              <Link to={`/requests/${request.id}/edit`} className={secondaryButtonClass}>
                Save Draft
              </Link>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <label className="block text-sm font-semibold text-slate-900" htmlFor="spoc-response-notes">
                SPOC Correction Response
              </label>
              <textarea
                id="spoc-response-notes"
                value={spocResponseNotes}
                onChange={(event) => setSpocResponseNotes(event.target.value)}
                rows={5}
                disabled={!canSubmit || isActionLoading}
                className="mt-2 block min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Summarize what changed before resubmission."
              />
              {spocResponseError && <p className="mt-1 text-xs font-medium text-rose-700">{spocResponseError}</p>}
              {referenceMaterials.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Optional attachment references
                  </p>
                  <div className="mt-2 space-y-2">
                    {referenceMaterials.map((material) => (
                      <label key={material.id} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={spocAttachmentIds.includes(material.id)}
                          onChange={() => toggleSpocAttachment(material.id)}
                          disabled={!canSubmit || isActionLoading}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                        />
                        <span>{material.original_filename}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ActionButton
              disabled={!canSubmit || !canSpocResubmitAfterRegionalEdits || isActionLoading}
              className={primaryButtonClass}
              onClick={submitSpocResponse}
            >
              Resubmit to Regional Marketing
            </ActionButton>
          </div>
        )}

        {showRegionalPanel && (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">Regional Evaluation Checklist</p>
              <ul className="mt-2 grid gap-1 text-sm text-slate-600">
                <li>Strategic alignment</li>
                <li>Duplicate/similarity check</li>
                <li>Resource capacity</li>
                <li>Budget validation</li>
                <li>Cross-country applicability</li>
                <li>Regulatory feasibility</li>
              </ul>
            </div>
            <ActionGroup>
              {status !== "UNDER_REGIONAL_REVIEW" && (
                <ActionButton
                  disabled={!canRegionalEvaluate || isActionLoading}
                  className={primaryButtonClass}
                  onClick={() => onRegionalAction("start", {}, "Regional evaluation started.")}
                >
                  Start Evaluation
                </ActionButton>
              )}
              <ActionButton
                disabled={!canApproveRouteRegional || isActionLoading}
                className={primaryButtonClass}
                onClick={() => {
                  const notes = onPromptComment("Approval notes");
                  onRegionalAction("approve-route", { notes }, "Approved and routed to Therapy Lead.");
                }}
              >
                Approve & Route
              </ActionButton>
              <ActionButton
                disabled={!canRequestModification || !canReturnToSpocFromStatus || isActionLoading}
                className={secondaryButtonClass}
                onClick={openReturnModal}
              >
                Request Modification
              </ActionButton>
              <ActionButton
                disabled={!canRegionalEdit || !canReturnWithRegionalEdits || status !== "UNDER_REGIONAL_REVIEW" || isActionLoading}
                className={secondaryButtonClass}
                onClick={openRegionalEditModal}
              >
                Edit Request & Return
              </ActionButton>
              <ActionButton
                disabled={!canRejectRegional || isActionLoading}
                className={dangerButtonClass}
                onClick={() => regionalReason("reject", "Rejection reason", "Content request rejected.")}
              >
                Reject
              </ActionButton>
              <ActionButton
                disabled={!canDeferRegional || isActionLoading}
                className={secondaryButtonClass}
                onClick={deferRegional}
              >
                Defer
              </ActionButton>
              <ActionButton
                disabled={!canMergeRegional || isActionLoading}
                className={secondaryButtonClass}
                onClick={mergeRegional}
              >
                Merge
              </ActionButton>
            </ActionGroup>
          </div>
        )}

        {medicalReviewNavigationStatuses.includes(status) && (
          <div className="space-y-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <div>
              <p className="font-semibold text-sky-950">Medical Content Review</p>
              <p className="mt-1">Use the Medical Review workspace for draft review, comments, references, and decision actions.</p>
            </div>
            {canContinueMedicalReview ? (
              <Link to={`/requests/${request.id}/medical-review`} className={primaryButtonClass}>
                Continue Medical Review
              </Link>
            ) : (
              <p className="text-xs font-medium text-sky-900">
                This task is available to the assigned Medical Reviewer.
              </p>
            )}
          </div>
        )}

        {status === "SUBMITTED" && !showRegionalPanel && (
          <ActionGroup>
            <ActionButton
              disabled={!canTherapyReview || isActionLoading}
              className={primaryButtonClass}
              onClick={() => onAction("send_to_therapy_review", { successMessage: "Sent to therapy review." })}
            >
              Send to Therapy Review
            </ActionButton>
            <ActionButton
              disabled={!canTherapyReview || isActionLoading}
              className={dangerButtonClass}
              onClick={reject}
            >
              Reject
            </ActionButton>
            <WithdrawButton
              request={request}
              disabled={!canWithdraw || isActionLoading}
              onAction={onAction}
            />
          </ActionGroup>
        )}

        {status === "THERAPY_REVIEW" && (
          <ActionGroup>
            <ActionButton
              disabled={!canTherapyReview || isActionLoading}
              className={primaryButtonClass}
              onClick={() => onAction("therapy_approve", { successMessage: "Approved to marketing review." })}
            >
              Approve to Marketing Review
            </ActionButton>
            <ActionButton
              disabled={!canTherapyReview || isActionLoading}
              className={secondaryButtonClass}
              onClick={() =>
                requestChanges(
                  "therapy_request_changes",
                  "Therapy changes requested.",
                  "Therapy changes requested.",
                )
              }
            >
              Request Changes
            </ActionButton>
            <ActionButton disabled={!canTherapyReview || isActionLoading} className={dangerButtonClass} onClick={reject}>
              Reject
            </ActionButton>
          </ActionGroup>
        )}

        {status === "THERAPY_CHANGES_REQUESTED" && (
          <ActionButton
            disabled={!canSubmit || isActionLoading}
            className={primaryButtonClass}
            onClick={() => onAction("resubmit", { successMessage: "Resubmitted to therapy review." })}
          >
            Resubmit
          </ActionButton>
        )}

        {status === "MARKETING_REVIEW" && (
          <ActionGroup>
            <ActionButton
              disabled={!canMarketingReview || isActionLoading}
              className={primaryButtonClass}
              onClick={() => onAction("marketing_approve", { successMessage: "Marked ready for MLR." })}
            >
              Approve / Ready for MLR
            </ActionButton>
            <ActionButton
              disabled={!canMarketingReview || isActionLoading}
              className={secondaryButtonClass}
              onClick={() =>
                requestChanges(
                  "marketing_request_changes",
                  "Marketing changes requested.",
                  "Marketing changes requested.",
                )
              }
            >
              Request Changes
            </ActionButton>
            <ActionButton disabled={!canMarketingReview || isActionLoading} className={dangerButtonClass} onClick={reject}>
              Reject
            </ActionButton>
          </ActionGroup>
        )}

        {status === "MARKETING_CHANGES_REQUESTED" && (
          <ActionButton
            disabled={!canSubmit || isActionLoading}
            className={primaryButtonClass}
            onClick={() => onAction("resubmit", { successMessage: "Resubmitted to marketing review." })}
          >
            Resubmit
          </ActionButton>
        )}

        {status === "READY_FOR_MLR" && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Add review content, upload a primary file, mark it Ready for Review, then submit MLR.
            {readyLinkedDocuments.length > 0 && (
              <span className="mt-1 block font-semibold">
                {readyLinkedDocuments.length} review content record ready for MLR submission.
              </span>
            )}
          </div>
        )}

        {status === "MLR_CHANGES_REQUESTED" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            MLR changes were requested. Update review content, mark it Ready for Review, then submit MLR again.
            {readyLinkedDocuments.length > 0 && (
              <span className="mt-1 block font-semibold">
                {readyLinkedDocuments.length} review content record ready for resubmission.
              </span>
            )}
          </div>
        )}

        {showTherapyLeadPanel && status === "APPROVED_ASSIGNED_TO_THERAPY_LEAD" && (
          <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div>
              <p className="font-semibold text-emerald-950">Therapy Lead Draft Creation</p>
              <p className="mt-1">Review the approved request package and start content draft creation.</p>
            </div>
            <ActionButton
              disabled={!canStartTherapyDraft || isActionLoading}
              className={primaryButtonClass}
              onClick={onStartTherapyDraftCreation}
            >
              Start Draft Creation
            </ActionButton>
            {!isAssignedTherapyLead && !canStartTherapyDraft && (
              <p className="text-xs font-medium text-emerald-900">
                This action is available to the assigned Therapy Lead.
              </p>
            )}
          </div>
        )}

        {showTherapyLeadPanel && status === "MEDICAL_REVISION_REQUIRED" && (
          <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <div>
              <p className="font-semibold text-orange-950">Medical Revision Required</p>
              <p className="mt-1">Review Medical feedback and start the assigned revision task.</p>
            </div>
            {medicalRevisionContextErrorMessage && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {medicalRevisionContextErrorMessage}
              </div>
            )}
            {medicalRevisionContext ? (
              <>
                <MedicalFeedbackSummary context={medicalRevisionContext} />
                {medicalRevisionContext.blocking_reasons.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {medicalRevisionContext.blocking_reasons.map((reason) => (
                      <p key={reason}>{reason}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm font-medium text-orange-900">
                {request.therapy_medical_revision_task ? "Medical feedback is loading." : "No active Therapy Medical Revision task found."}
              </p>
            )}
            <ActionButton
              disabled={!canStartMedicalRevision || isActionLoading}
              className={primaryButtonClass}
              onClick={onStartMedicalRevision}
            >
              Start Medical Revision
            </ActionButton>
            {!canStartMedicalRevision && (
              <p className="text-xs font-medium text-orange-900">
                This action is available to the assigned Therapy Lead with content authoring permission.
              </p>
            )}
          </div>
        )}

        {showTherapyLeadPanel && status === "MEDICAL_REVISION_IN_PROGRESS" && (
          primaryWorkspace ? (
            <div className="space-y-4">
              <WorkspaceSummaryCard workspace={primaryWorkspace} />
              {medicalRevisionContext && <MedicalFeedbackSummary context={medicalRevisionContext} />}
              {medicalRevisionContextErrorMessage && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {medicalRevisionContextErrorMessage}
                </div>
              )}
              {showAuthoringStudioLink ? (
                <Link to={`/documents/${primaryWorkspace.id}/authoring`} className={primaryButtonClass}>
                  Open Authoring Studio
                </Link>
              ) : (
                <Link to={`/documents/${primaryWorkspace.id}`} className={primaryButtonClass}>
                  Open Content Dashboard
                </Link>
              )}
              {showDraftVersionsPanel && currentDraftVersion && (
                <div className="space-y-3">
                  <DraftVersionCard version={currentDraftVersion} onDownload={onDownloadContentVersion} />
                  <DraftVersionList versions={draftVersions} onDownload={onDownloadContentVersion} />
                </div>
              )}
              <ActionButton
                disabled={!canCreateDraftVersion || isActionLoading}
                className={secondaryButtonClass}
                onClick={onOpenDraftVersionModal}
              >
                Create Revised Draft Version
              </ActionButton>
              <ActionButton
                disabled={!canResubmitMedicalReview || isActionLoading}
                className={primaryButtonClass}
                onClick={onOpenMedicalRevisionResubmitModal}
              >
                Resubmit to Medical Review
              </ActionButton>
              {medicalRevisionContext?.blocking_reasons?.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  {medicalRevisionContext.blocking_reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Content dashboard is missing for this Medical revision.
            </div>
          )
        )}

        {showTherapyLeadPanel && ["DRAFT_IN_PROGRESS", "DRAFT_VERSION_READY"].includes(status) && showContentWorkspacePanel && (
          primaryWorkspace ? (
            <div className="space-y-4">
              <WorkspaceSummaryCard workspace={primaryWorkspace} />
              {showAuthoringStudioLink ? (
                <Link to={`/documents/${primaryWorkspace.id}/authoring`} className={primaryButtonClass}>
                  Open Authoring Studio
                </Link>
              ) : (
                <Link to={`/documents/${primaryWorkspace.id}`} className={primaryButtonClass}>
                  Open Content Dashboard
                </Link>
              )}
              {showDraftVersionsPanel && currentDraftVersion ? (
                <div className="space-y-3">
                  <DraftVersionCard version={currentDraftVersion} onDownload={onDownloadContentVersion} />
                  <DraftVersionList versions={draftVersions} onDownload={onDownloadContentVersion} />
                  {(canSubmitMedicalReview ||
                    isAssignedTherapyLead ||
                    request.medical_submission_readiness?.can_show_submit_medical_review_placeholder) && (
                    <SubmitMedicalReviewPanel
                      request={request}
                      isActionLoading={isActionLoading}
                      canSubmitMedicalReview={canSubmitMedicalReview}
                      onOpen={onOpenMedicalSubmitModal}
                    />
                  )}
                </div>
              ) : showDraftVersionsPanel ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Create the first Therapy Lead draft version for this content dashboard.
                  </p>
                  <ActionButton
                    disabled={!canCreateDraftVersion || isActionLoading}
                    className={primaryButtonClass}
                    onClick={onOpenDraftVersionModal}
                  >
                    Create Draft Version
                  </ActionButton>
                  {!canCreateDraftVersion && (
                    <p className="text-xs font-medium text-slate-500">
                      This action is available to the assigned Therapy Lead with content authoring permission.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Create the content dashboard that will hold drafts, files, versions, review comments, and future approvals.
              </p>
              <ActionButton
                disabled={!canCreateContentWorkspace || isActionLoading}
                className={primaryButtonClass}
                onClick={onCreateContentWorkspace}
              >
                Create Content Dashboard
              </ActionButton>
              {!canCreateContentWorkspace && (
                <p className="text-xs font-medium text-slate-500">
                  This action is available to the assigned Therapy Lead.
                </p>
              )}
            </div>
          )
        )}

        {[
          "DESIGN_BRIEF_SUBMITTED",
          "DESIGN_IN_PROGRESS",
          "DESIGN_DRAFT_UPLOADED",
          "DESIGN_REVIEW_IN_PROGRESS",
          "DESIGN_REVISION_REQUIRED",
          "DESIGN_REVISION_IN_PROGRESS",
          "DESIGN_APPROVED",
        ].includes(status) && (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            {status === "DESIGN_BRIEF_SUBMITTED"
              ? "Waiting for Designer to start design work."
              : status === "DESIGN_IN_PROGRESS"
                ? "Designer is preparing the design draft."
                : status === "DESIGN_DRAFT_UPLOADED"
                  ? canReviewDesignDraft
                    ? "Design Draft V1 uploaded. Review is ready for the Therapy Lead."
                    : isAssignedDesigner
                      ? "Design Draft V1 uploaded. Waiting for Therapy Lead review."
                      : "Design Draft V1 uploaded. Waiting for Therapy Lead review."
                  : status === "DESIGN_REVIEW_IN_PROGRESS"
                    ? canReviewDesignDraft
                      ? "Design review is in progress."
                      : "Waiting for Therapy Lead decision."
                    : status === "DESIGN_REVISION_REQUIRED"
                      ? isAssignedDesigner
                        ? "Design revision requested. Step 5D will enable revised upload."
                        : "Design revision has been requested from Designer."
                      : status === "DESIGN_REVISION_IN_PROGRESS"
                        ? isAssignedDesigner
                          ? "Design revision is in progress. Upload the revised design draft when ready."
                          : "Designer is preparing the revised design draft."
                      : "Design approved. Proof-reading will be available in the next step."}
            <div className="mt-3">
              <Link to={`/requests/${request.id}/design`} className={secondaryButtonClass}>
                {status === "DESIGN_DRAFT_UPLOADED" && canReviewDesignDraft
                  ? "Review Design Draft"
                  : status === "DESIGN_REVIEW_IN_PROGRESS" && canReviewDesignDraft
                    ? "Continue Design Review"
                    : (status === "DESIGN_REVISION_REQUIRED" || status === "DESIGN_REVISION_IN_PROGRESS") && isAssignedDesigner
                      ? "Open Revision Request"
                      : "Open Design Production"}
              </Link>
            </div>
          </div>
        )}

        {status === "FINAL_APPROVAL" && (
          <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Final approval is managed from the Final Approval section.
          </div>
        )}

        {!isTerminal(status) &&
          ![
            "DRAFT",
            "SUBMITTED",
            "READY_FOR_MLR",
            "APPROVED_ASSIGNED_TO_THERAPY_LEAD",
            "DRAFT_IN_PROGRESS",
            "MEDICAL_REVISION_REQUIRED",
            "MEDICAL_REVISION_IN_PROGRESS",
            "DESIGN_BRIEF_SUBMITTED",
            "DESIGN_IN_PROGRESS",
            "DESIGN_DRAFT_UPLOADED",
            "DESIGN_REVIEW_IN_PROGRESS",
            "DESIGN_REVISION_REQUIRED",
            "DESIGN_REVISION_IN_PROGRESS",
            "DESIGN_APPROVED",
            "DESIGN_REVIEW",
            "FINAL_APPROVAL",
          ].includes(status) && (
          <WithdrawButton
            request={request}
            disabled={!canWithdraw || isActionLoading}
            onAction={onAction}
          />
        )}

        {isTerminal(status) && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No further request actions are available in this status.
          </div>
        )}
      </div>

      {isRegionalEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Regional Edit Request</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {regionalEditChangedCount} changed field{regionalEditChangedCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsRegionalEditModalOpen(false)}
                disabled={isActionLoading}
              >
                Close
              </button>
            </div>

            {regionalEditFormError && (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {regionalEditFormError}
              </div>
            )}

            <div className="mt-4 space-y-5">
              {regionalEditableGroups.map((group) => {
                const fields = regionalEditableFields.filter((field) => field.group === group);
                return (
                  <div key={group} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-950">{group}</h3>
                    <div className="mt-3 grid gap-3">
                      {fields.map((field) => {
                        const oldValue = field.getValue(request);
                        const currentValue = regionalEditValues[field.key] ?? "";
                        const oldDisplayValue = displayRegionalFieldValue(field.key, oldValue, masterData, request);
                        const options = regionalEditOptionsForField(field.key, masterData, request);
                        const selectedValues = normalizeRegionalIdValues(currentValue);
                        const changed = oldValue.trim() !== currentValue.trim();
                        return (
                          <div key={field.key} className="grid gap-2 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <span>
                              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {field.label} Old
                              </span>
                              <span className="mt-1 block rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-600">
                                {oldDisplayValue}
                              </span>
                            </span>
                            <span>
                              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {field.label} New
                              </span>
                              {field.input === "multiselect" ? (
                                <div
                                  className={[
                                    "mt-1 rounded-md border bg-white p-3",
                                    changed ? "border-amber-300" : "border-slate-300",
                                  ].join(" ")}
                                >
                                  {options.length > 0 ? (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {options.map((option) => (
                                        <label key={option.value} className="flex items-start gap-2 text-sm text-slate-700">
                                          <input
                                            type="checkbox"
                                            checked={selectedValues.includes(option.value)}
                                            onChange={() => toggleRegionalMultiselectValue(field.key, option.value)}
                                            disabled={isActionLoading}
                                            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                                          />
                                          <span>{option.label}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      value={currentValue}
                                      onChange={(event) =>
                                        setRegionalEditValues((current) => ({
                                          ...current,
                                          [field.key]: event.target.value,
                                        }))
                                      }
                                      disabled={isActionLoading}
                                      className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                                    />
                                  )}
                                </div>
                              ) : field.input === "select" ? (
                                <select
                                  value={currentValue}
                                  onChange={(event) =>
                                    setRegionalEditValues((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  disabled={isActionLoading}
                                  className={[
                                    "mt-1 block h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100",
                                    changed ? "border-amber-300" : "border-slate-300",
                                  ].join(" ")}
                                >
                                  <option value="">Not set</option>
                                  {options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : field.input === "textarea" ? (
                                <textarea
                                  rows={3}
                                  value={currentValue}
                                  onChange={(event) =>
                                    setRegionalEditValues((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  disabled={isActionLoading}
                                  className={[
                                    "mt-1 block min-h-[88px] w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100",
                                    changed ? "border-amber-300" : "border-slate-300",
                                  ].join(" ")}
                                />
                              ) : (
                                <input
                                  type={field.input}
                                  value={currentValue}
                                  onChange={(event) =>
                                    setRegionalEditValues((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  disabled={isActionLoading}
                                  className={[
                                    "mt-1 block h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100",
                                    changed ? "border-amber-300" : "border-slate-300",
                                  ].join(" ")}
                                />
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-950">Changed Field Summary</h3>
                {regionalEditChangedCount === 0 ? (
                  <p className="mt-2 text-sm text-amber-800">No field values changed.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-amber-900">
                    {regionalEditableFields
                      .filter((field) => Object.prototype.hasOwnProperty.call(regionalEditChangedFields, field.key))
                      .map((field) => (
                        <li key={field.key}>
                          <span className="font-semibold">{field.label}:</span>{" "}
                          {displayRegionalFieldValue(field.key, field.getValue(request), masterData, request)} to{" "}
                          {displayRegionalFieldValue(field.key, regionalEditChangedFields[field.key], masterData, request)}
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason Category
                </span>
                <select
                  value={regionalEditReturnForm.reason_category}
                  onChange={(event) =>
                    setRegionalEditReturnForm((current) => ({
                      ...current,
                      reason_category: event.target.value,
                    }))
                  }
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  disabled={isActionLoading}
                >
                  <option value="">Select reason</option>
                  {revisionReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Return Notes
                </span>
                <textarea
                  value={regionalEditReturnForm.return_notes}
                  onChange={(event) =>
                    setRegionalEditReturnForm((current) => ({
                      ...current,
                      return_notes: event.target.value,
                    }))
                  }
                  rows={5}
                  className="mt-2 block min-h-[130px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  disabled={isActionLoading}
                />
              </label>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Required Corrections
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {requiredCorrectionOptions.map((correction) => (
                    <label key={correction} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={regionalEditReturnForm.required_corrections.includes(correction)}
                        onChange={() => toggleRegionalEditCorrection(correction)}
                        disabled={isActionLoading}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                      />
                      <span>{correction}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setIsRegionalEditModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={submitRegionalEditReturn}
                disabled={isActionLoading}
              >
                Return to SPOC
              </button>
            </div>
          </div>
        </div>
      )}

      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Return Request to Country SPOC</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revision Cycle {latestOpenRevisionCycle ? latestOpenRevisionCycle.cycle_number + 1 : "new"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsReturnModalOpen(false)}
                disabled={isActionLoading}
              >
                Close
              </button>
            </div>

            {returnFormError && (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {returnFormError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason Category
                </span>
                <select
                  value={returnForm.return_reason_code}
                  onChange={(event) =>
                    setReturnForm((current) => ({
                      ...current,
                      return_reason_code: event.target.value,
                    }))
                  }
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  disabled={isActionLoading}
                >
                  <option value="">Select reason</option>
                  {revisionReasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Return Notes
                </span>
                <textarea
                  value={returnForm.return_notes}
                  onChange={(event) =>
                    setReturnForm((current) => ({
                      ...current,
                      return_notes: event.target.value,
                    }))
                  }
                  rows={5}
                  className="mt-2 block min-h-[130px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  disabled={isActionLoading}
                  placeholder="Describe what the SPOC needs to clarify or change."
                />
              </label>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Required Corrections
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {requiredCorrectionOptions.map((correction) => (
                    <label key={correction} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={returnForm.required_corrections.includes(correction)}
                        onChange={() => toggleReturnCorrection(correction)}
                        disabled={isActionLoading}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                      />
                      <span>{correction}</span>
                    </label>
                  ))}
                </div>
              </div>

              {referenceMaterials.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Optional Attachment References
                  </p>
                  <div className="mt-2 space-y-2">
                    {referenceMaterials.map((material) => (
                      <label key={material.id} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={returnForm.return_attachment_ids.includes(material.id)}
                          onChange={() => toggleReturnAttachment(material.id)}
                          disabled={isActionLoading}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                        />
                        <span>{material.original_filename}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setIsReturnModalOpen(false)}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={submitReturnModal}
                disabled={isActionLoading}
              >
                Return to SPOC
              </button>
            </div>
          </div>
        </div>
      )}
    </SummaryCard>
  );
}


type ActionGroupProps = {
  children: ReactNode;
};


function ActionGroup({ children }: ActionGroupProps) {
  return <div className="flex flex-col gap-2">{children}</div>;
}


type ActionButtonProps = {
  children: ReactNode;
  className: string;
  disabled?: boolean;
  onClick: () => void;
};


function ActionButton({ children, className, disabled = false, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={["w-full", className].join(" ")}
    >
      {children}
    </button>
  );
}


type WorkspaceSummaryCardProps = {
  workspace: ContentWorkspaceSummary;
};


function WorkspaceSummaryCard({ workspace }: WorkspaceSummaryCardProps) {
  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-teal-950">{workspace.document_number}</p>
          <p className="mt-1 text-teal-900">{workspace.title}</p>
        </div>
        <StatusBadge status={workspace.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <DetailRow label="Content Type" value={workspace.content_type?.name ?? fallbackName(null, workspace.content_type_id)} />
        <DetailRow label="Owner" value={workspace.owner?.full_name ?? fallbackName(null, workspace.owner_id)} />
        <DetailRow label="Created" value={formatDateTime(workspace.created_at)} />
      </dl>
    </div>
  );
}


type DraftVersionCardProps = {
  version: ContentVersion;
  onDownload: (version: ContentVersion) => void;
};


function DraftVersionCard({ version, onDownload }: DraftVersionCardProps) {
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
      <dl className="mt-4 grid gap-3">
        <DetailRow label="Created By" value={version.created_by?.full_name ?? fallbackName(null, version.created_by_id)} />
        <DetailRow label="Created At" value={formatDateTime(version.created_at)} />
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


type DraftVersionListProps = {
  versions: ContentVersion[];
  onDownload: (version: ContentVersion) => void;
};


function DraftVersionList({ versions, onDownload }: DraftVersionListProps) {
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
        <p className="text-sm font-semibold text-slate-950">Draft Versions</p>
      </div>
      <div className="divide-y divide-slate-200">
        {versions.map((version) => (
          <div key={version.id} className="grid gap-2 px-4 py-3 text-sm text-slate-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  V{version.version_number} / {version.version_label ?? "Draft"}
                </p>
                <p className="mt-1 text-xs text-slate-500">{version.change_summary || "No change summary"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {version.is_current && <StatusBadge status="ACTIVE" label="Current" />}
                <StatusBadge status={version.status} />
              </div>
            </div>
            <div className="grid gap-1 text-xs text-slate-500">
              <span>{version.created_by?.full_name ?? `User ${version.created_by_id}`} / {formatDateTime(version.created_at)}</span>
              {version.asset ? (
                <button
                  type="button"
                  className="w-fit font-semibold text-brand-700 hover:text-brand-600"
                  onClick={() => onDownload(version)}
                >
                  {version.asset.original_filename}
                </button>
              ) : (
                <span>No file attached</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


type WithdrawButtonProps = {
  request: MaterialRequest;
  disabled: boolean;
  onAction: (
    action: MaterialRequestTransitionAction,
    options: ActionOptions,
  ) => void;
};


function WithdrawButton({ request, disabled, onAction }: WithdrawButtonProps) {
  return (
    <ActionButton
      disabled={disabled}
      className={dangerButtonClass}
      onClick={() =>
        onAction("withdraw", {
          confirmMessage: `Withdraw ${request.request_number ?? "this content request"}?`,
          successMessage: "Content request withdrawn.",
        })
      }
    >
      Withdraw
    </ActionButton>
  );
}


type RegionalReturnNotesPanelProps = {
  request: MaterialRequest;
  cycle: ContentRequestRevisionCycle | null;
  amendment: ContentRequestRegionalAmendment | null;
  masterData: MaterialRequestMasterData;
};


function RegionalReturnNotesPanel({ request, cycle, amendment, masterData }: RegionalReturnNotesPanelProps) {
  const changes = amendmentFieldChanges(amendment);
  const requiredCorrections = amendment?.required_corrections ?? amendment?.required_corrections_json ?? cycle?.required_corrections ?? [];
  const returnNotes = amendment?.return_notes ?? cycle?.return_notes ?? null;
  const reason = amendment?.reason_category ?? cycle?.return_reason_label ?? cycle?.return_reason_code ?? null;

  return (
    <SummaryCard title="Returned by Regional Marketing">
      {!cycle && !amendment ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No structured return notes found. Please check request activity/history.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Regional proposed changes must be verified before resubmission.
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Revision Cycle" value={cycle ? `Revision Cycle ${cycle.cycle_number}` : "Not set"} />
            <DetailRow
              label="Returned By"
              value={
                cycle?.returned_by?.full_name ??
                amendment?.edited_by?.full_name ??
                (cycle?.returned_by_user_id ? `User ${cycle.returned_by_user_id}` : "Not set")
              }
            />
            <DetailRow label="Returned At" value={cycle?.returned_at ? formatDateTime(cycle.returned_at) : amendment?.returned_at ? formatDateTime(amendment.returned_at) : "Not set"} />
            <DetailRow label="Reason" value={reason ?? "Not set"} />
          </dl>
          <DetailBlock title="Return Notes" value={returnNotes ?? "Not set"} />
          {requiredCorrections.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Required Corrections
              </h3>
              <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                {requiredCorrections.map((correction) => (
                  <li key={correction}>{correction}</li>
                ))}
              </ul>
            </div>
          )}
          <RegionalAmendmentDiffList changes={changes} masterData={masterData} request={request} />
          {cycle && <RevisionAttachmentList title="Return Attachments" materials={cycle.return_attachments} />}
        </div>
      )}
    </SummaryCard>
  );
}


function RegionalAmendmentDiffList({
  changes,
  masterData,
  request,
}: {
  changes: ContentRequestRegionalFieldChange[];
  masterData: MaterialRequestMasterData;
  request: MaterialRequest;
}) {
  if (changes.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No field-level regional edits were proposed.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Regional Proposed Field Changes
      </h3>
      <div className="mt-2 grid gap-2">
        {changes.map((change) => (
          <div key={`${change.field}-${formatAuditValue(change.new_value)}`} className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-950">{change.label}</p>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Old value</span>
                <p className="mt-1 text-slate-700">
                  {change.old_display_value ?? displayRegionalFieldValue(change.field, change.old_value, masterData, request)}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">New value</span>
                <p className="mt-1 text-slate-950">
                  {change.new_display_value ?? displayRegionalFieldValue(change.field, change.new_value, masterData, request)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


type TherapyAlignmentPanelProps = {
  request: MaterialRequest;
  comments: ContentCollaborationComment[];
  errorMessage?: string | null;
  isSubmitting: boolean;
  currentUserId?: number;
  isAssignedTherapyLead: boolean;
  isAdmin: boolean;
  canComment: boolean;
  canComplete: boolean;
  canUseInternalTherapy: boolean;
  canUseAdminOnly: boolean;
  onCreateComment: (payload: ContentCollaborationCommentCreatePayload) => Promise<void>;
  onResolveComment: (commentId: string) => Promise<void>;
  onReopenComment: (commentId: string) => Promise<void>;
  onCompleteAlignment: (payload: TherapyAlignmentCompletePayload) => Promise<void>;
};


function getAlignmentTopicLabel(topicCode: string): string {
  return collaborationTopicOptions.find((option) => option.value === topicCode)?.label ?? topicCode.split("_").join(" ");
}


function getAlignmentVisibilityLabel(visibility: string): string {
  return collaborationVisibilityOptions.find((option) => option.value === visibility)?.label ?? visibility.split("_").join(" ");
}


function TherapyAlignmentPanel({
  request,
  comments,
  errorMessage,
  isSubmitting,
  currentUserId,
  isAssignedTherapyLead,
  isAdmin,
  canComment,
  canComplete,
  canUseInternalTherapy,
  canUseAdminOnly,
  onCreateComment,
  onResolveComment,
  onReopenComment,
  onCompleteAlignment,
}: TherapyAlignmentPanelProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<CollaborationTopicCode | "ALL">("ALL");
  const [commentForm, setCommentForm] = useState<ContentCollaborationCommentCreatePayload>({
    stage_code: "THERAPY_ALIGNMENT",
    topic_code: "KEY_MESSAGES",
    comment_text: "",
    visibility: "SHARED",
    is_decision_note: false,
  });
  const [composerError, setComposerError] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState("");
  const [completionChecklist, setCompletionChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(therapyAlignmentChecklistItems.map((item) => [item.key, false])),
  );
  const [completionError, setCompletionError] = useState<string | null>(null);
  const alignmentStatus = request.therapy_alignment_status ?? "PENDING";
  const openCount =
    request.open_therapy_alignment_comment_count ??
    comments.filter((comment) => comment.status === "OPEN").length;
  const filteredComments =
    topicFilter === "ALL"
      ? comments
      : comments.filter((comment) => comment.topic_code === topicFilter);
  const availableVisibilityOptions = collaborationVisibilityOptions.filter((option) => {
    if (option.value === "INTERNAL_THERAPY") {
      return canUseInternalTherapy;
    }
    if (option.value === "ADMIN_ONLY") {
      return canUseAdminOnly;
    }
    return true;
  });

  async function submitComment() {
    const commentText = commentForm.comment_text.trim();
    if (commentText.length < 5) {
      setComposerError("Comment must be at least 5 characters.");
      return;
    }
    setComposerError(null);
    await onCreateComment({
      ...commentForm,
      stage_code: "THERAPY_ALIGNMENT",
      comment_text: commentText,
      visibility: commentForm.visibility ?? "SHARED",
    });
    setCommentForm({
      stage_code: "THERAPY_ALIGNMENT",
      topic_code: "KEY_MESSAGES",
      comment_text: "",
      visibility: "SHARED",
      is_decision_note: false,
    });
    setIsComposerOpen(false);
  }

  async function submitCompletion() {
    const alignmentSummary = completionSummary.trim();
    if (alignmentSummary.length < 20) {
      setCompletionError("Alignment summary must be at least 20 characters.");
      return;
    }
    setCompletionError(null);
    await onCompleteAlignment({
      alignment_summary: alignmentSummary,
      checklist_json: completionChecklist,
    });
    setCompletionSummary("");
    setCompletionChecklist(Object.fromEntries(therapyAlignmentChecklistItems.map((item) => [item.key, false])));
    setIsCompleteModalOpen(false);
  }

  return (
    <div id="therapy-alignment">
      <SummaryCard
        title="Therapy Alignment"
        action={
          <div className="flex flex-wrap gap-2">
            {canComment && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setIsComposerOpen((current) => !current)}
                disabled={isSubmitting}
              >
                Add Comment
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => setIsCompleteModalOpen(true)}
                disabled={isSubmitting}
              >
                Mark Alignment Complete
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          {errorMessage && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {errorMessage}
            </div>
          )}

          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Alignment Status" value={therapyAlignmentStatusLabels[alignmentStatus] ?? alignmentStatus} />
            <DetailRow label="Open Comments" value={String(openCount)} />
            {alignmentStatus === "COMPLETED" && (
              <>
                <DetailRow
                  label="Completed By"
                  value={request.therapy_alignment_completed_by?.full_name ?? (request.therapy_alignment_completed_by_id ? `User ${request.therapy_alignment_completed_by_id}` : "Not set")}
                />
                <DetailRow
                  label="Completed At"
                  value={request.therapy_alignment_completed_at ? formatDateTime(request.therapy_alignment_completed_at) : "Not set"}
                />
              </>
            )}
          </dl>

          {alignmentStatus === "COMPLETED" && request.therapy_alignment_summary && (
            <DetailBlock title="Alignment Summary" value={request.therapy_alignment_summary} />
          )}

          {isComposerOpen && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topic</span>
                  <select
                    value={commentForm.topic_code}
                    onChange={(event) =>
                      setCommentForm((current) => ({
                        ...current,
                        topic_code: event.target.value as CollaborationTopicCode,
                      }))
                    }
                    className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    {collaborationTopicOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visibility</span>
                  <select
                    value={commentForm.visibility ?? "SHARED"}
                    onChange={(event) =>
                      setCommentForm((current) => ({
                        ...current,
                        visibility: event.target.value as CollaborationVisibility,
                      }))
                    }
                    className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    {availableVisibilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(commentForm.is_decision_note)}
                    onChange={(event) =>
                      setCommentForm((current) => ({ ...current, is_decision_note: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                  />
                  Decision note
                </label>
              </div>
              <label className="mt-4 block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</span>
                <textarea
                  value={commentForm.comment_text}
                  onChange={(event) => setCommentForm((current) => ({ ...current, comment_text: event.target.value }))}
                  rows={4}
                  maxLength={10000}
                  className="mt-2 block min-h-[110px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              {composerError && <p className="mt-2 text-xs font-medium text-rose-700">{composerError}</p>}
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className={secondaryButtonClass} onClick={() => setIsComposerOpen(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="button" className={primaryButtonClass} onClick={() => void submitComment()} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Comment"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-900">Alignment Comments</p>
            <label className="block text-sm">
              <span className="sr-only">Filter by topic</span>
              <select
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value as CollaborationTopicCode | "ALL")}
                className="block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                <option value="ALL">All Topics</option>
                {collaborationTopicOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredComments.length === 0 ? (
            <EmptyState
              title="No alignment comments yet."
              description="Key message and positioning discussions will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
              {filteredComments.map((comment) => {
                const canUpdateComment = isAdmin || isAssignedTherapyLead || comment.created_by?.id === currentUserId;
                return (
                  <div key={comment.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                        {getAlignmentTopicLabel(comment.topic_code)}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {getAlignmentVisibilityLabel(comment.visibility)}
                      </span>
                      <StatusBadge status={comment.status} />
                      {comment.is_decision_note && (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Decision Note
                        </span>
                      )}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.comment_text}</p>
                    <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {comment.created_by?.full_name ?? "User"} / {formatDateTime(comment.created_at)}
                      </span>
                      {canUpdateComment && (
                        comment.status === "OPEN" ? (
                          <button
                            type="button"
                            className="w-fit font-semibold text-brand-700 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-400"
                            disabled={isSubmitting}
                            onClick={() => void onResolveComment(comment.id)}
                          >
                            Resolve
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="w-fit font-semibold text-brand-700 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-400"
                            disabled={isSubmitting}
                            onClick={() => void onReopenComment(comment.id)}
                          >
                            Reopen
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SummaryCard>

      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">Complete Therapy Alignment</h2>
              <button type="button" className={secondaryButtonClass} onClick={() => setIsCompleteModalOpen(false)} disabled={isSubmitting}>
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {therapyAlignmentChecklistItems.map((item) => (
                <label key={item.key} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(completionChecklist[item.key])}
                    onChange={() =>
                      setCompletionChecklist((current) => ({
                        ...current,
                        [item.key]: !current[item.key],
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alignment Summary</span>
              <textarea
                value={completionSummary}
                onChange={(event) => setCompletionSummary(event.target.value)}
                rows={5}
                maxLength={10000}
                className="mt-2 block min-h-[130px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            {completionError && <p className="mt-2 text-xs font-medium text-rose-700">{completionError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={secondaryButtonClass} onClick={() => setIsCompleteModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="button" className={primaryButtonClass} onClick={() => void submitCompletion()} disabled={isSubmitting}>
                {isSubmitting ? "Completing..." : "Complete Alignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


type RevisionHistoryPanelProps = {
  cycles: ContentRequestRevisionCycle[];
  errorMessage?: string | null;
};


function RevisionHistoryPanel({ cycles, errorMessage }: RevisionHistoryPanelProps) {
  return (
    <SummaryCard title="Revision History / Return History">
      {errorMessage ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {errorMessage}
        </div>
      ) : cycles.length === 0 ? (
        <EmptyState
          title="No revision cycles yet."
          description="Returned requests and SPOC correction responses will appear here."
        />
      ) : (
        <div className="space-y-4">
          {[...cycles]
            .sort((left, right) => left.cycle_number - right.cycle_number)
            .map((cycle) => (
              <div key={cycle.id} className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Revision Cycle {cycle.cycle_number}
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {cycle.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailRow label="Stage" value={getRevisionStageLabel(cycle.stage_code)} />
                  <DetailRow
                    label="Returned By"
                    value={cycle.returned_by?.full_name ?? (cycle.returned_by_user_id ? `User ${cycle.returned_by_user_id}` : "Not set")}
                  />
                  <DetailRow label="Returned At" value={cycle.returned_at ? formatDateTime(cycle.returned_at) : "Not set"} />
                  <DetailRow label="Reason" value={cycle.return_reason_label ?? cycle.return_reason_code ?? "Not set"} />
                </dl>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <DetailBlock title="Return Notes" value={cycle.return_notes || "Not set"} />
                  <DetailBlock
                    title="SPOC Response"
                    value={cycle.spoc_response_notes || "Not yet resubmitted"}
                  />
                </div>
                {cycle.required_corrections.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Required Corrections
                    </h4>
                    <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                      {cycle.required_corrections.map((correction) => (
                        <li key={`${cycle.id}-${correction}`}>{correction}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <RevisionAttachmentList title="Return Attachments" materials={cycle.return_attachments} />
                  <RevisionAttachmentList title="SPOC Attachments" materials={cycle.spoc_attachments} />
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DetailRow
                    label="Resubmitted By"
                    value={cycle.resubmitted_by?.full_name ?? (cycle.resubmitted_by_user_id ? `User ${cycle.resubmitted_by_user_id}` : "Not resubmitted")}
                  />
                  <DetailRow
                    label="Resubmitted At"
                    value={cycle.resubmitted_at ? formatDateTime(cycle.resubmitted_at) : "Not resubmitted"}
                  />
                </dl>
              </div>
            ))}
        </div>
      )}
    </SummaryCard>
  );
}


type RevisionAttachmentListProps = {
  title: string;
  materials: ContentRequestReferenceMaterial[];
};


function RevisionAttachmentList({ title, materials }: RevisionAttachmentListProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {materials.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {materials.map((material) => (
            <li key={material.id}>{material.original_filename}</li>
          ))}
        </ul>
      )}
    </div>
  );
}


type LinkedDocumentsProps = {
  request: MaterialRequest;
  documents: LinkedDocument[];
  errorMessage?: string | null;
  isActionLoading: boolean;
  currentUserId?: number;
  isAdmin: boolean;
  canCreateLinkedDocument: boolean;
  onSubmitMlr: (documentId: number) => void;
};


type ReferenceMaterialsProps = {
  materials: ContentRequestReferenceMaterial[];
  onView: (material: ContentRequestReferenceMaterial) => void;
  onDownload: (material: ContentRequestReferenceMaterial) => void;
};


function ReferenceMaterials({ materials, onView, onDownload }: ReferenceMaterialsProps) {
  return (
    <SummaryCard title="Reference Materials">
      {materials.length === 0 ? (
        <EmptyState
          title="No reference materials."
          description="Reference files added during request intake appear here."
        />
      ) : (
        <div className="divide-y divide-slate-200">
          {materials.map((material) => (
            <div key={material.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{material.original_filename}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {material.mime_type} / {formatFileSize(material.file_size)} / Uploaded by{" "}
                  {material.uploaded_by?.full_name ?? `User ${material.uploaded_by_id}`} /{" "}
                  {formatDateTime(material.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onView(material)}
                  className="inline-flex h-8 items-center justify-center rounded-md bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-600"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(material)}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SummaryCard>
  );
}


function LinkedDocuments({
  request,
  documents,
  errorMessage,
  isActionLoading,
  currentUserId,
  isAdmin,
  canCreateLinkedDocument,
  onSubmitMlr,
}: LinkedDocumentsProps) {
  const canSubmitMlr =
    request.status === "READY_FOR_MLR" || request.status === "MLR_CHANGES_REQUESTED";

  return (
    <SummaryCard
      title="Review Content"
      action={
        canCreateLinkedDocument ? (
          <Link to={`/documents/create?request_id=${request.id}`} className={secondaryButtonClass}>
            Add Review Content
          </Link>
        ) : undefined
      }
    >
      {errorMessage && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {errorMessage}
        </div>
      )}
      {!errorMessage && documents.length === 0 ? (
        <EmptyState
          title="No linked content yet."
          description="Add review content after request reaches Ready for MLR."
        />
      ) : documents.length > 0 ? (
        <div className="divide-y divide-slate-200">
          {documents.map((document) => {
            const latestMlr = document.latestMlrContentVersion;
            const canSubmitThisDocument =
              canSubmitMlr &&
              document.status === "READY_FOR_REVIEW" &&
              (isAdmin || document.owner_id === currentUserId);

            return (
              <div key={document.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{document.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {document.document_number} / v{document.latestVersionNumber} / Updated {formatDate(document.updated_at)}
                  </p>
                  {latestMlr && (
                    <p className="mt-1 break-words text-xs font-medium text-slate-700">
                      MLR: {latestMlr.version_label || `V${latestMlr.version_number}`} /{" "}
                      {latestMlr.asset?.original_filename ?? `Asset ${latestMlr.asset_id}`}
                      {latestMlr.is_current ? " / Current" : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={document.status} />
                  {canSubmitThisDocument && (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => onSubmitMlr(document.id)}
                      className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Submit MLR Review
                    </button>
                  )}
                  <Link
                    to={`/library/${document.id}`}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </SummaryCard>
  );
}


type HistoryTimelineProps = {
  history: MaterialRequestHistory[];
  errorMessage?: string | null;
};


function HistoryTimeline({ history, errorMessage }: HistoryTimelineProps) {
  return (
    <div>
      {errorMessage ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {errorMessage}
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          title="No activity yet."
          description="History entries appear after request stage transitions are recorded."
        />
      ) : (
        <ol className="space-y-4">
          {history.map((entry) => (
            <li key={entry.id} className="border-l-2 border-slate-200 pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={entry.to_status} />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {getActivityActionLabel(entry.action)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-950">
                {entry.from_status ? getStatusLabel(entry.from_status) : "Start"} to {getStatusLabel(entry.to_status)}
              </p>
              {typeof entry.metadata?.cycle_number === "number" && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Revision Cycle {entry.metadata.cycle_number}
                </p>
              )}
              {entry.comment && (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.comment}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {formatDateTime(entry.created_at)} by {entry.changed_by?.full_name ?? `User ${entry.changed_by_id}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}


type CommentsSummaryProps = {
  annotations: ReviewAnnotation[];
  errorMessage?: string | null;
};


function CommentsSummary({ annotations, errorMessage }: CommentsSummaryProps) {
  if (errorMessage) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {errorMessage}
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <EmptyState
        title="No comments yet."
        description="Review comments appear here after MLR reviewers add feedback."
      />
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {annotations.slice(0, 8).map((annotation) => (
        <div key={annotation.id} className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={annotation.status} />
            {annotation.is_mandatory_change && (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                Mandatory
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {annotation.comment_text}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {annotation.reviewer_name ?? "Reviewer"} / {formatDateTime(annotation.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
}


type FilesSummaryProps = {
  documents: LinkedDocument[];
  errorMessage?: string | null;
};


function FilesSummary({ documents, errorMessage }: FilesSummaryProps) {
  if (errorMessage) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {errorMessage}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No files linked yet."
        description="Linked review content appears once content is added to the request."
      />
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {documents.map((document) => (
        <div key={document.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">{document.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {document.document_number} / v{document.latestVersionNumber}
            </p>
          </div>
          <Link
            to={`/library/${document.id}`}
            className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}


type AuditSummaryProps = {
  request: MaterialRequest;
};


function AuditSummary({ request }: AuditSummaryProps) {
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
      <DetailRow label="Submitted" value={request.submitted_at ? formatDateTime(request.submitted_at) : "Not submitted"} />
      <DetailRow label="Completed" value={request.completed_at ? formatDateTime(request.completed_at) : "Not completed"} />
      <DetailRow label="Created" value={formatDateTime(request.created_at)} />
      <DetailRow label="Updated" value={formatDateTime(request.updated_at)} />
    </dl>
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

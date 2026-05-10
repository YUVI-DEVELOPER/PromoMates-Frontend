import type { DocumentUser } from "./document";
import type {
  ContentRequestReferenceMaterial,
  MedicalSubmissionReadiness,
  MaterialRequestUser,
  MedicalReferenceValidation,
  MedicalReviewComment,
  MedicalReviewDraftVersionContext,
  WorkflowTaskSummary,
  TherapyAlignmentCommentSummary,
  TherapyAlignmentStatus,
} from "./materialRequest";


export type AssetType =
  | "REFERENCE_ARTICLE"
  | "MEDICAL_CONTENT"
  | "DRAFT_PPT"
  | "MLR_REVIEW_FILE"
  | "DESIGN_DRAFT"
  | "PRINT_READY_FILE"
  | "DIGITAL_ASSET"
  | "FINAL_APPROVED_COPY"
  | "SUPPORTING_FILE";


export type ContentStage =
  | "DRAFT"
  | "MLR_REVIEW"
  | "DESIGN"
  | "FINAL"
  | "SUPPORTING";


export type ContentVersionType = "DRAFT";


export type ContentVersionStatus =
  | "DRAFT"
  | "SUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_REVIEW_IN_PROGRESS"
  | "MEDICAL_CONTENT_APPROVED"
  | "MEDICAL_REVISION_REQUIRED"
  | "RESUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_APPROVED"
  | "REVISION_REQUIRED";


export type ContentAuthoringMode = "FILE_UPLOAD" | "INTERNAL_EDITOR" | "HYBRID";


export const contentAuthoringModeLabels: Record<ContentAuthoringMode, string> = {
  FILE_UPLOAD: "File Upload",
  INTERNAL_EDITOR: "Internal Editor",
  HYBRID: "Hybrid",
};


export const assetTypeLabels: Record<AssetType, string> = {
  REFERENCE_ARTICLE: "Reference Article",
  MEDICAL_CONTENT: "Medical Content",
  DRAFT_PPT: "Draft PPT",
  MLR_REVIEW_FILE: "MLR Review File",
  DESIGN_DRAFT: "Design Draft",
  PRINT_READY_FILE: "Print-ready File",
  DIGITAL_ASSET: "Digital Asset",
  FINAL_APPROVED_COPY: "Final Approved Copy",
  SUPPORTING_FILE: "Supporting File",
};


export const assetTypeOptions: Array<{ value: AssetType; label: string }> = [
  // TODO: Replace these centralized enum options with /lookups/system-options in upload forms.
  { value: "REFERENCE_ARTICLE", label: assetTypeLabels.REFERENCE_ARTICLE },
  { value: "MEDICAL_CONTENT", label: assetTypeLabels.MEDICAL_CONTENT },
  { value: "DRAFT_PPT", label: assetTypeLabels.DRAFT_PPT },
  { value: "MLR_REVIEW_FILE", label: assetTypeLabels.MLR_REVIEW_FILE },
  { value: "DESIGN_DRAFT", label: assetTypeLabels.DESIGN_DRAFT },
  { value: "PRINT_READY_FILE", label: assetTypeLabels.PRINT_READY_FILE },
  { value: "DIGITAL_ASSET", label: assetTypeLabels.DIGITAL_ASSET },
  { value: "FINAL_APPROVED_COPY", label: assetTypeLabels.FINAL_APPROVED_COPY },
  { value: "SUPPORTING_FILE", label: assetTypeLabels.SUPPORTING_FILE },
];


export const contentStageLabels: Record<ContentStage, string> = {
  DRAFT: "Draft",
  MLR_REVIEW: "MLR Review",
  DESIGN: "Design",
  FINAL: "Final",
  SUPPORTING: "Supporting",
};


export const contentStageOptions: Array<{ value: ContentStage; label: string }> = [
  // TODO: Replace these centralized enum options with /lookups/system-options in upload forms.
  { value: "DRAFT", label: contentStageLabels.DRAFT },
  { value: "MLR_REVIEW", label: contentStageLabels.MLR_REVIEW },
  { value: "DESIGN", label: contentStageLabels.DESIGN },
  { value: "FINAL", label: contentStageLabels.FINAL },
  { value: "SUPPORTING", label: contentStageLabels.SUPPORTING },
];


export type ContentVersionAsset = {
  id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  version_number: number;
  asset_type: AssetType;
  is_primary: boolean;
  download_url?: string | null;
};


export type ContentVersionReference = {
  id: number;
  name: string;
  code?: string | null;
};


export type ContentVersion = {
  id: string;
  request_id: string | null;
  document_id: number | null;
  asset_id: number | null;
  revision_source_version_id?: string | null;
  version_number: number;
  version_label: string | null;
  version_type: ContentVersionType;
  status: ContentVersionStatus;
  content_stage: ContentStage | null;
  created_by_id: number;
  agency_id: number | null;
  language_id: number | null;
  file_format: string | null;
  thumbnail_url: string | null;
  dimensions: string | null;
  is_current: boolean;
  is_final_approved: boolean;
  draft_notes: string | null;
  change_summary: string | null;
  content_json?: Record<string, unknown> | unknown[] | null;
  content_html?: string | null;
  plain_text?: string | null;
  authoring_mode: ContentAuthoringMode;
  snapshot_hash?: string | null;
  autosave_json?: Record<string, unknown> | unknown[] | null;
  autosaved_at?: string | null;
  finalized_at?: string | null;
  editor_session_id?: string | null;
  last_edited_by_id?: number | null;
  last_edited_at?: string | null;
  created_at: string;
  updated_at: string;
  asset?: ContentVersionAsset | null;
  created_by?: DocumentUser | null;
  last_edited_by?: DocumentUser | null;
  agency?: ContentVersionReference | null;
  language?: ContentVersionReference | null;
};


export type ContentVersionCreatePayload = {
  request_id?: string | null;
  document_id?: number | null;
  asset_id?: number | null;
  revision_source_version_id?: string | null;
  version_number?: number | null;
  version_label?: string | null;
  version_type?: ContentVersionType;
  status?: ContentVersionStatus;
  content_stage?: ContentStage | null;
  agency_id?: number | null;
  language_id?: number | null;
  file_format?: string | null;
  thumbnail_url?: string | null;
  dimensions?: string | null;
  is_current?: boolean;
  is_final_approved?: boolean;
  draft_notes?: string | null;
  change_summary?: string | null;
  content_json?: Record<string, unknown> | unknown[] | null;
  content_html?: string | null;
  plain_text?: string | null;
  authoring_mode?: ContentAuthoringMode;
  snapshot_hash?: string | null;
};


export type ContentVersionUpdatePayload = Partial<
  Omit<ContentVersionCreatePayload, "request_id" | "document_id" | "asset_id" | "version_number">
>;


export type ContentVersionListParams = {
  request_id?: string;
  document_id?: number;
  asset_type?: AssetType;
  content_stage?: ContentStage;
  is_current?: boolean;
  page?: number;
  page_size?: number;
};


export type ContentVersionListResponse = {
  items: ContentVersion[];
  total: number;
  page: number;
  page_size: number;
};


export type DraftVersionCreatePayload = {
  version_label?: string | null;
  draft_notes?: string | null;
  change_summary: string;
  file_asset_id?: number | null;
  draft_file?: File | null;
};


export type EditorAutosavePayload = {
  content_json: Record<string, unknown> | unknown[];
  content_html: string;
  plain_text: string;
  editor_session_id?: string | null;
};


export type EditorAutosaveResponse = {
  autosaved_at: string;
  editor_session_id?: string | null;
};


export type DraftVersionFromEditorPayload = {
  version_label?: string | null;
  content_json: Record<string, unknown> | unknown[];
  content_html: string;
  plain_text: string;
  change_summary: string;
  draft_notes?: string | null;
  file_asset_id?: number | null;
  editor_session_id?: string | null;
};


export type ContentWorkspaceRequest = {
  id: string;
  request_number: string | null;
  title: string | null;
  status: string;
  requested_by_id: number;
  assigned_therapy_lead_id: number | null;
  business_objective?: string | null;
  key_messages?: string | null;
  local_requirements?: string | null;
  reference_notes?: string | null;
  priority?: string | null;
  regional_evaluation_notes: string | null;
  regional_decision_reason: string | null;
  therapy_alignment_status: TherapyAlignmentStatus;
  therapy_alignment_summary: string | null;
  therapy_alignment_checklist_json?: Record<string, unknown> | unknown[] | null;
  therapy_alignment_completed_by_id: number | null;
  therapy_alignment_completed_at: string | null;
  therapy_alignment_completed_by?: DocumentUser | null;
  open_therapy_alignment_comment_count?: number;
  latest_therapy_alignment_comments?: TherapyAlignmentCommentSummary[];
  medical_submission_readiness?: MedicalSubmissionReadiness;
};


export type ContentWorkspaceDetail = {
  id: number;
  content_code: string;
  document_number: string;
  title: string;
  status: string;
  request_id: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
  linked_request: ContentWorkspaceRequest | null;
  regional_evaluation_notes: string | null;
  regional_decision_reason: string | null;
  reference_materials: ContentRequestReferenceMaterial[];
  current_draft_version: ContentVersion | null;
  approved_medical_content_version?: ContentVersion | null;
  active_design_brief?: import("./materialRequest").DesignBriefSummary | null;
  design_task_summary?: WorkflowTaskSummary | null;
  draft_versions: ContentVersion[];
  draft_versions_count: number;
  medical_submission_status?: string | null;
  medical_review_task_summary?: WorkflowTaskSummary | null;
  submitted_at?: string | null;
  submitted_by?: MaterialRequestUser | null;
};


export type DraftVersionCreateResponse = {
  draft_version: ContentVersion;
  content_workspace: ContentWorkspaceDetail;
  request: unknown;
  next_action: "SUBMIT_TO_MEDICAL_REVIEW" | "RESUBMIT_TO_MEDICAL_REVIEW";
};


export type ContentWorkspaceEditorAutosave = {
  content_json?: Record<string, unknown> | unknown[] | null;
  content_html?: string | null;
  plain_text?: string | null;
  autosaved_at?: string | null;
  editor_session_id?: string | null;
  last_edited_by_id?: number | null;
  last_edited_at?: string | null;
  last_edited_by?: DocumentUser | null;
};


export type ContentWorkspaceMedicalFeedback = {
  medical_comments: MedicalReviewComment[];
  open_mandatory_comments: MedicalReviewComment[];
  optional_comments: MedicalReviewComment[];
  resolved_comments: MedicalReviewComment[];
  reference_validations: MedicalReferenceValidation[];
  reference_issues: MedicalReferenceValidation[];
  medical_revision?: {
    revision_requested_by_id?: number | null;
    revision_requested_by?: MaterialRequestUser | null;
    revision_requested_at?: string | null;
    revision_reason?: string | null;
    revision_notes?: string | null;
  };
  task?: WorkflowTaskSummary | null;
  content_workspace?: unknown;
  medical_reviewed_version?: MedicalReviewDraftVersionContext | null;
};


export type ContentWorkspaceEditorDetail = {
  content_workspace: ContentWorkspaceDetail;
  linked_request: ContentWorkspaceRequest | null;
  latest_autosave: ContentWorkspaceEditorAutosave | null;
  current_draft_version: ContentVersion | null;
  reference_materials: ContentRequestReferenceMaterial[];
  regional_evaluation_notes: string | null;
  regional_decision_reason: string | null;
  local_requirements: string | null;
  key_messages: string | null;
  can_edit_authoring_content: boolean;
  medical_feedback?: ContentWorkspaceMedicalFeedback | null;
};

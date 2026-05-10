import type { AssetType, ContentStage, ContentVersion } from "./contentVersion";
import type { DocumentUser } from "./document";
import type { DesignAgency } from "./masterData";
import type { UserGroupOption } from "./userGroup";


export type DesignJobStatus =
  | "DRAFT"
  | "SUBMITTED_TO_DESIGN"
  | "DESIGN_IN_PROGRESS"
  | "DESIGN_DRAFT_UPLOADED"
  | "DESIGN_REVIEW_IN_PROGRESS"
  | "DESIGN_APPROVED"
  | "DESIGN_REVISION_REQUIRED"
  | "IN_PROGRESS"
  | "REVISION_REQUESTED"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "CANCELLED";


export type DesignJobTransitionAction =
  | "submit_for_review"
  | "approve_design"
  | "request_revision"
  | "cancel"
  | "submit_design_review"
  | "request_design_revision";


export type DesignJobDocument = {
  id: number;
  document_number: string;
  title: string;
  status: string;
};


export type DesignJob = {
  id: string;
  request_id: string;
  source_document_id: number | null;
  content_workspace_id?: number | null;
  document_id?: number | null;
  source_content_version_id: string | null;
  approved_content_version_id?: string | null;
  current_design_content_version_id: string | null;
  agency_id: number | null;
  design_agency_id?: number | null;
  assigned_designer_id: number | null;
  assigned_design_group_id?: number | null;
  design_coordinator_id: number | null;
  submitted_by_id?: number | null;
  brief_code?: string | null;
  design_title?: string | null;
  design_objective?: string | null;
  design_format?: string | null;
  channel_id?: number | null;
  audience_summary?: string | null;
  brand_guidelines?: string | null;
  visual_direction?: string | null;
  mandatory_content?: string | null;
  claims_and_references_notes?: string | null;
  local_requirements?: string | null;
  output_specifications?: string | null;
  size_or_dimension?: string | null;
  language_id?: number | null;
  priority?: string | null;
  status: DesignJobStatus;
  brief: string | null;
  design_notes: string | null;
  revision_count: number;
  current_iteration?: number;
  iteration_limit?: number;
  due_date: string | null;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  agency?: DesignAgency | null;
  assigned_designer?: DocumentUser | null;
  assigned_design_group?: { id: number; name: string; code?: string | null } | null;
  design_coordinator?: DocumentUser | null;
  submitted_by?: DocumentUser | null;
  created_by?: DocumentUser | null;
  channel?: { id: number; name: string; code?: string | null } | null;
  language?: { id: number; name: string; code?: string | null } | null;
  source_document?: DesignJobDocument | null;
  source_content_version?: ContentVersion | null;
  approved_content_version?: ContentVersion | null;
  current_design_content_version?: ContentVersion | null;
};


export type DesignJobHistory = {
  id: string;
  design_job_id: string;
  request_id: string;
  from_status: DesignJobStatus | null;
  to_status: DesignJobStatus;
  action: string;
  comment: string | null;
  changed_by_id: number;
  created_at: string;
  changed_by?: DocumentUser | null;
};

export type DesignDraftStatus =
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "REVISION_REQUESTED"
  | "APPROVED";


export type DesignDraft = {
  id: string;
  design_brief_id: string;
  design_job_id: string;
  request_id: string;
  content_workspace_id: number | null;
  approved_content_version_id: string | null;
  draft_number: number;
  draft_label: string;
  file_asset_id: number | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  preview_url?: string | null;
  download_url?: string | null;
  upload_notes: string | null;
  change_summary: string | null;
  status: DesignDraftStatus;
  uploaded_by_id: number;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  uploaded_by?: DocumentUser | null;
};


export type DesignReviewAnnotationSummary = {
  total: number;
  open: number;
  mandatory_open: number;
  resolved: number;
};


export type DesignJobCreatePayload = {
  request_id: string;
  source_document_id?: number | null;
  source_content_version_id?: string | null;
  agency_id?: number | null;
  assigned_designer_id?: number | null;
  design_coordinator_id?: number | null;
  brief?: string | null;
  design_notes?: string | null;
  due_date?: string | null;
};


export type SendToDesignPayload = Omit<DesignJobCreatePayload, "request_id">;


export type DesignJobUpdatePayload = Omit<DesignJobCreatePayload, "request_id" | "source_document_id" | "source_content_version_id">;


export type DesignBriefPayload = {
  content_workspace_id?: number | null;
  document_id?: number | null;
  approved_content_version_id?: string | null;
  brief_code?: string | null;
  design_title?: string | null;
  design_objective?: string | null;
  design_format?: string | null;
  channel_id?: number | null;
  audience_summary?: string | null;
  brand_guidelines?: string | null;
  visual_direction?: string | null;
  mandatory_content?: string | null;
  claims_and_references_notes?: string | null;
  local_requirements?: string | null;
  output_specifications?: string | null;
  size_or_dimension?: string | null;
  language_id?: number | null;
  due_date?: string | null;
  priority?: string | null;
  assigned_designer_id?: number | null;
  assigned_design_group_id?: number | null;
  design_agency_id?: number | null;
  agency_id?: number | null;
  design_notes?: string | null;
  brief?: string | null;
  iteration_limit?: number | null;
};


export type DesignBriefActionResponse = {
  request: import("./materialRequest").MaterialRequest;
  brief: DesignJob;
  design_task?: import("./materialRequest").WorkflowTaskSummary | null;
  next_action?: string | null;
};

export type DesignProductionActionResponse = {
  request: import("./materialRequest").MaterialRequest;
  brief: DesignJob;
  design_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_review_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_draft?: DesignDraft | null;
  next_action?: string | null;
};

export type DesignReviewApprovePayload = {
  decision_notes: string;
  confirm_content_unchanged: boolean;
  confirm_design_brief_followed: boolean;
};

export type DesignReviewRevisionPayload = {
  revision_reason: string;
  revision_notes?: string | null;
  requested_changes?: string[];
  due_date?: string | null;
  include_open_annotation_ids?: string[];
  annotation_summary?: {
    open_comment_count: number;
    mandatory_comment_count: number;
    design_draft_id?: string | null;
    current_iteration: number;
    iteration_limit: number;
  } | null;
};

export type DesignReviewActionResponse = {
  request: import("./materialRequest").MaterialRequest;
  brief: DesignJob;
  design_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_review_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_revision_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_draft?: DesignDraft | null;
  next_action?: string | null;
};

export type DesignRevisionAnnotationResponsePayload = {
  annotation_id: string;
  status: "ADDRESSED" | "NOT_ADDRESSED";
  note?: string | null;
};

export type DesignRevisionSummary = {
  design_draft_id?: string | null;
  design_draft_label?: string | null;
  previous_design_draft_id?: string | null;
  previous_design_draft_label?: string | null;
  revision_reason?: string | null;
  revision_notes?: string | null;
  requested_changes?: string[];
  included_annotation_ids?: string[];
  open_comment_count?: number;
  mandatory_comment_count?: number;
  current_iteration?: number;
  iteration_limit?: number;
  due_at?: string | null;
  requested_at?: string | null;
  requested_by_name?: string | null;
};


export type DesignTask = {
  task_id: number;
  task_type: string;
  object_type: string;
  request_id: string;
  request_code: string | null;
  request_title: string | null;
  request_status: string;
  task_status?: string | null;
  status: string;
  product?: { id: number; name: string; code?: string | null } | null;
  country?: { id: number; name: string; code?: string | null } | null;
  therapy_area?: { id: number; name: string; code?: string | null } | null;
  sub_therapy_area?: { id: number; name: string; code?: string | null } | null;
  content_type?: { id: number; name: string; code?: string | null } | null;
  design_format?: string | null;
  due_at: string | null;
  design_brief_id: string | null;
  design_brief_title: string | null;
  design_status?: string | null;
  latest_design_draft_id?: string | null;
  latest_design_draft_label?: string | null;
  draft_count?: number;
  uploaded_draft_count: number;
  assigned_user_id: number | null;
  assigned_group_id: number | null;
  assigned_user_name?: string | null;
  assigned_group_name?: string | null;
  action: string;
  action_label: string;
};

export type DesignReviewTask = {
  task_id: number;
  request_id: string;
  request_code: string | null;
  request_title: string | null;
  product?: { id: number; name: string; code?: string | null } | null;
  country?: { id: number; name: string; code?: string | null } | null;
  design_draft_label?: string | null;
  design_draft_status?: string | null;
  current_iteration: number;
  iteration_limit: number;
  open_comment_count: number;
  mandatory_comment_count: number;
  task_status: string;
  assigned_user_name?: string | null;
  assigned_group_name?: string | null;
  due_at: string | null;
  action_label: string;
};

export type DesignContext = {
  request: import("./materialRequest").MaterialRequest;
  design_brief: DesignJob | null;
  approved_medical_content_version: ContentVersion | null;
  reference_materials: import("./materialRequest").ContentRequestReferenceMaterial[];
  assigned_designer?: DocumentUser | null;
  assigned_group?: { id: number; name: string; code?: string | null } | null;
  design_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_review_task_summary?: import("./materialRequest").WorkflowTaskSummary | null;
  active_design_revision_task?: import("./materialRequest").WorkflowTaskSummary | null;
  design_drafts: DesignDraft[];
  previous_design_draft?: DesignDraft | null;
  latest_design_draft?: DesignDraft | null;
  design_review_annotations?: DesignReviewAnnotationSummary;
  design_review_annotations_summary?: DesignReviewAnnotationSummary;
  design_review_annotations_url?: string | null;
  annotation_summary?: DesignReviewAnnotationSummary;
  revision_annotations?: import("./reviewAnnotation").ReviewAnnotation[];
  revision_summary?: DesignRevisionSummary | null;
  design_decision_summary?: Record<string, unknown> | null;
  latest_design_draft_id?: string | null;
  latest_design_draft_label?: string | null;
  latest_design_revision_summary?: DesignRevisionSummary | null;
  iteration_count?: number;
  current_iteration?: number;
  iteration_limit?: number;
  can_start_design_work: boolean;
  can_upload_design_draft: boolean;
  can_start_revision?: boolean;
  can_upload_revised_draft?: boolean;
  can_start_design_review?: boolean;
  can_approve_design_draft?: boolean;
  can_request_design_revision?: boolean;
  blocking_reasons?: string[];
  next_action?: string | null;
};


export type DesignAssignee = {
  id: number;
  full_name: string;
  email: string;
  role_codes: string[];
  group_ids: number[];
  group_names: string[];
  permission_keys: string[];
};


export type DesignAssigneeOptions = {
  designers: DesignAssignee[];
  design_groups: UserGroupOption[];
  design_agencies: DesignAgency[];
};


export type DesignJobTransitionPayload = {
  action: DesignJobTransitionAction | string;
  comment?: string | null;
  content_version_id?: string | null;
};


export type DesignJobUploadPayload = {
  document_id?: number | null;
  asset_type?: AssetType;
  version_label?: string | null;
  change_summary?: string | null;
  content_stage?: ContentStage;
  is_primary?: boolean;
};


export type DesignDraftUploadPayload = {
  design_brief_id?: string | null;
  draft_label?: string | null;
  upload_notes?: string | null;
  change_summary?: string | null;
};


export type DesignRevisionUploadPayload = {
  design_brief_id?: string | null;
  draft_label?: string | null;
  designer_notes?: string | null;
  change_summary: string;
  addressed_annotation_ids?: string[];
  unresolved_annotation_ids?: string[];
  annotation_responses?: DesignRevisionAnnotationResponsePayload[];
};

import type {
  Audience,
  Brand,
  Campaign,
  Channel,
  Country,
  DocumentType,
  Product,
  Region,
  SubTherapyArea,
  TherapeuticArea,
} from "./masterData";


export type MaterialRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "SUBMITTED_PENDING_REGIONAL_REVIEW"
  | "UNDER_REGIONAL_REVIEW"
  | "RETURNED_TO_SPOC"
  | "SPOC_REVISION_IN_PROGRESS"
  | "RESUBMITTED"
  | "RESUBMITTED_PENDING_REGIONAL_REVIEW"
  | "APPROVED_ASSIGNED_TO_THERAPY_LEAD"
  | "DRAFT_IN_PROGRESS"
  | "DRAFT_VERSION_READY"
  | "SUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_REVIEW_IN_PROGRESS"
  | "MEDICAL_REVISION_REQUIRED"
  | "MEDICAL_REVISION_IN_PROGRESS"
  | "RESUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_CONTENT_APPROVED"
  | "DESIGN_BRIEF_IN_PROGRESS"
  | "DESIGN_BRIEF_SUBMITTED"
  | "DEFERRED"
  | "MERGED"
  | "CLOSED"
  | "THERAPY_REVIEW"
  | "THERAPY_CHANGES_REQUESTED"
  | "MARKETING_REVIEW"
  | "MARKETING_CHANGES_REQUESTED"
  | "READY_FOR_MLR"
  | "MLR_IN_REVIEW"
  | "MLR_CHANGES_REQUESTED"
  | "MLR_APPROVED"
  | "DESIGN_IN_PROGRESS"
  | "DESIGN_DRAFT_UPLOADED"
  | "DESIGN_REVIEW_IN_PROGRESS"
  | "DESIGN_APPROVED"
  | "DESIGN_REVISION_REQUIRED"
  | "DESIGN_REVISION_IN_PROGRESS"
  | "DESIGN_REVIEW"
  | "FINAL_APPROVAL"
  | "FINAL_APPROVED"
  | "DISTRIBUTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";


export type MaterialRequestPriority = string;


export type TherapyAlignmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type MedicalCommentCategory =
  | "MEDICAL_ACCURACY"
  | "CLAIM_SUPPORT"
  | "REFERENCE_REQUIRED"
  | "SAFETY_BALANCE"
  | "OFF_LABEL_RISK"
  | "WORDING_CLARITY"
  | "LOCAL_MEDICAL_REQUIREMENT"
  | "OTHER";


export type MedicalCommentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";


export type MedicalReviewCommentStatus = "OPEN" | "RESOLVED" | "REOPENED" | "DISMISSED";


export type MedicalReferenceValidationStatus =
  | "PENDING"
  | "VALIDATED"
  | "NEEDS_REPLACEMENT"
  | "NOT_APPLICABLE";


export type MedicalRevisionReason =
  | "MEDICAL_ACCURACY_ISSUE"
  | "CLAIM_SUPPORT_REQUIRED"
  | "REFERENCE_REPLACEMENT_REQUIRED"
  | "SAFETY_BALANCE_REQUIRED"
  | "WORDING_REVISION_REQUIRED"
  | "OTHER";


export type MaterialRequestTransitionAction =
  | "submit"
  | "send_to_therapy_review"
  | "therapy_approve"
  | "therapy_request_changes"
  | "marketing_approve"
  | "marketing_request_changes"
  | "resubmit"
  | "reject"
  | "withdraw";


export type MaterialRequestUser = {
  id: number;
  full_name: string;
  email: string;
};


export type TherapyAlignmentCommentSummary = {
  id: string;
  topic_code: string;
  comment_text: string;
  visibility: string;
  status: string;
  is_decision_note: boolean;
  created_by?: MaterialRequestUser | null;
  created_at: string;
};


export type MedicalSubmissionReadiness = {
  has_content_workspace: boolean;
  has_current_draft_version: boolean;
  therapy_alignment_completed: boolean;
  has_medical_reviewer_assignment?: boolean;
  can_submit_medical_review: boolean;
  can_submit_medical_review_permission?: boolean;
  medical_assignment_configured?: boolean | null;
  medical_reviewer_assignment?: {
    assignment_found: boolean;
    assignment_type: string | null;
    assigned_user_id: number | null;
    assigned_group_id: number | null;
    assignment_rule_id: number | null;
    reason: string;
    warnings: string[];
    assigned_user?: MaterialRequestUser | null;
    assigned_group?: { id: number; name: string; code?: string | null } | null;
    display_name?: string | null;
  } | null;
  blocking_reasons?: string[];
  can_show_submit_medical_review_placeholder?: boolean;
};


export type ContentRequestPanelCode =
  | "REQUEST_SUMMARY"
  | "BUSINESS_CONTEXT"
  | "AUDIENCE_CHANNEL"
  | "MESSAGING"
  | "BUDGET_TIMELINE"
  | "REFERENCE_MATERIALS"
  | "REVISION_HISTORY"
  | "REQUEST_ACTIVITY"
  | "REGIONAL_EVALUATION"
  | "THERAPY_ALIGNMENT"
  | "CONTENT_WORKSPACE"
  | "DRAFT_VERSIONS"
  | "AUTHORING_STUDIO"
  | "MEDICAL_REVIEW"
  | "DESIGN_BRIEF"
  | "FORMAL_MLR";


export type ContentRequestAvailableAction =
  | "SUBMIT_CONTENT_REQUEST"
  | "EDIT_CONTENT_REQUEST"
  | "RESUBMIT_CONTENT_REQUEST"
  | "START_REGIONAL_EVALUATION"
  | "APPROVE_AND_ROUTE"
  | "REQUEST_MODIFICATION"
  | "REGIONAL_EDIT_REQUEST"
  | "RETURN_TO_SPOC_WITH_EDITS"
  | "REJECT"
  | "DEFER"
  | "MERGE"
  | "ACCEPT_REGIONAL_EDITS"
  | "EDIT_RETURNED_REQUEST"
  | "SAVE_RETURNED_DRAFT"
  | "RESUBMIT_TO_REGIONAL"
  | "START_THERAPY_DRAFT_CREATION"
  | "CREATE_CONTENT_WORKSPACE"
  | "CREATE_DRAFT_VERSION"
  | "OPEN_AUTHORING_STUDIO"
  | "ADD_THERAPY_ALIGNMENT_COMMENT"
  | "COMPLETE_THERAPY_ALIGNMENT"
  | "SUBMIT_TO_MEDICAL_REVIEW"
  | "START_MEDICAL_REVIEW"
  | "CONTINUE_MEDICAL_REVIEW"
  | "START_MEDICAL_REVISION"
  | "RESUBMIT_TO_MEDICAL_REVIEW"
  | "CREATE_DESIGN_BRIEF"
  | "SUBMIT_DESIGN_BRIEF";


export type ContentRequestUiVisibility = {
  active_stage_code: string;
  visible_panels: ContentRequestPanelCode[];
  hidden_panels: ContentRequestPanelCode[];
  available_actions: ContentRequestAvailableAction[];
};


export type ContentRequestReferenceMaterial = {
  id: number;
  request_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by_id: number;
  created_at: string;
  download_url?: string | null;
  uploaded_by?: MaterialRequestUser | null;
};


export type ContentRequestRegionalAmendmentStatus =
  | "DRAFT"
  | "RETURNED_TO_SPOC"
  | "ACCEPTED_BY_SPOC"
  | "REJECTED_BY_SPOC"
  | "SUPERSEDED";


export type ContentRequestRegionalFieldChange = {
  field: string;
  old_value: unknown;
  new_value: unknown;
  old_display_value?: string | null;
  new_display_value?: string | null;
  label: string;
};


export type ContentRequestRegionalAmendment = {
  id: string;
  request_id: string;
  revision_cycle_id: string | null;
  edited_by_id: number;
  status: ContentRequestRegionalAmendmentStatus;
  field_changes_json: ContentRequestRegionalFieldChange[];
  field_changes?: ContentRequestRegionalFieldChange[];
  reason_category: string | null;
  return_notes: string | null;
  required_corrections_json: string[] | null;
  required_corrections?: string[];
  created_at: string;
  updated_at: string;
  returned_at: string | null;
  accepted_by_spoc_at: string | null;
  accepted_by_spoc_id: number | null;
  edited_by?: MaterialRequestUser | null;
  accepted_by_spoc?: MaterialRequestUser | null;
};


export type MedicalReviewComment = {
  id: string;
  request_id: string;
  content_workspace_id: number | null;
  document_id?: number | null;
  content_version_id: string;
  workflow_task_id: number | null;
  review_task_id?: number | null;
  reviewer_id: number;
  stage_code: string;
  comment_category: MedicalCommentCategory;
  element_reference: string | null;
  comment_text: string;
  severity: MedicalCommentSeverity;
  is_mandatory_change: boolean;
  status: MedicalReviewCommentStatus;
  linked_reference_ids: number[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by_id: number | null;
  resolution_note?: string | null;
  reviewer_name?: string | null;
  resolved_by_name?: string | null;
};


export type MedicalReviewCommentCreatePayload = {
  content_workspace_id?: number | null;
  content_version_id?: string | null;
  workflow_task_id?: number | null;
  comment_category: MedicalCommentCategory;
  element_reference?: string | null;
  comment_text: string;
  severity?: MedicalCommentSeverity;
  is_mandatory_change?: boolean;
  linked_reference_ids?: number[];
};


export type MedicalReviewReadiness = {
  mandatory_comment_count: number;
  open_mandatory_comment_count: number;
  optional_comment_count: number;
  open_optional_comment_count?: number;
  reference_validation_count: number;
  unresolved_reference_issue_count: number;
  can_make_medical_decision_placeholder: boolean;
};


export type MedicalDecisionReadiness = {
  can_approve_medical_content: boolean;
  can_request_medical_revision: boolean;
  open_mandatory_comment_count: number;
  open_optional_comment_count: number;
  unresolved_reference_issue_count: number;
  blocking_reasons: string[];
  active_medical_task_status: string | null;
  decision_completed: boolean;
  decision_status: MaterialRequestStatus | string | null;
};


export type MedicalReferenceValidation = {
  id: string;
  request_id: string;
  content_workspace_id: number | null;
  content_version_id: string;
  workflow_task_id: number | null;
  reviewer_id: number;
  reference_material_id: number | null;
  uploaded_asset_id: number | null;
  claim_text: string | null;
  reference_note: string | null;
  validation_status: MedicalReferenceValidationStatus;
  validation_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: MaterialRequestUser | null;
  reference_material?: ContentRequestReferenceMaterial | null;
  uploaded_asset?: MedicalReviewDraftFile | null;
};


export type MedicalReferenceValidationCreatePayload = {
  content_version_id?: string | null;
  workflow_task_id?: number | null;
  reference_material_id?: number | null;
  uploaded_asset_id?: number | null;
  claim_text?: string | null;
  reference_note?: string | null;
  validation_status?: MedicalReferenceValidationStatus;
  validation_notes?: string | null;
};


export type MedicalReferenceValidationUpdatePayload = {
  validation_status: MedicalReferenceValidationStatus;
  validation_notes?: string | null;
};


export type ContentWorkspaceCurrentVersion = {
  id: string;
  revision_source_version_id?: string | null;
  version_number: number;
  version_label: string | null;
  version_type?: string | null;
  status?: string | null;
  content_stage: string | null;
  draft_notes?: string | null;
  change_summary?: string | null;
  asset_id?: number | null;
  created_at: string;
};


export type ContentWorkspaceSummary = {
  id: number;
  content_code: string;
  document_number: string;
  request_id: string | null;
  title: string;
  status: string;
  content_type_id: number | null;
  owner_id: number;
  is_active: boolean;
  created_at: string;
  content_type?: { id: number; name: string; code?: string | null } | null;
  owner?: MaterialRequestUser | null;
  current_version?: ContentWorkspaceCurrentVersion | null;
  current_draft_version?: ContentWorkspaceCurrentVersion | null;
  draft_versions_count?: number;
  next_action?: string | null;
};


export type DesignBriefSummary = {
  id: string;
  request_id: string;
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
  status: string;
  iteration_limit?: number | null;
  current_iteration?: number | null;
  created_by_id?: number | null;
  submitted_by_id?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  assigned_designer?: MaterialRequestUser | null;
  assigned_design_group?: { id: number; name: string; code?: string | null } | null;
  agency?: { id: number; name: string; code?: string | null } | null;
  submitted_by?: MaterialRequestUser | null;
  created_by?: MaterialRequestUser | null;
  channel?: { id: number; name: string; code?: string | null } | null;
  language?: { id: number; name: string; code?: string | null } | null;
};


export type MaterialRequest = {
  id: string;
  request_number: string | null;
  title: string | null;
  request_title?: string | null;
  description: string | null;
  brief_description?: string | null;
  region_id: number | null;
  country_id: number | null;
  primary_country_id?: number | null;
  brand_id: number | null;
  product_id: number | null;
  therapeutic_area_id: number | null;
  therapy_area_id?: number | null;
  sub_therapy_area_id: number | null;
  campaign_id: number | null;
  requested_by_id: number;
  assigned_therapy_lead_id: number | null;
  assigned_marketing_manager_id: number | null;
  material_type_id: number | null;
  content_type_id?: number | null;
  target_audience_id: number | null;
  target_audience_ids: number[] | null;
  additional_country_ids: number[] | null;
  channel_id: number | null;
  priority: MaterialRequestPriority | null;
  business_objective: string | null;
  key_messages: string | null;
  target_hcp_specialty: string | null;
  required_by_date: string | null;
  in_market_date?: string | null;
  estimated_quantity: number | null;
  budget_allocated: string | number | null;
  currency_code: string | null;
  reference_notes: string | null;
  local_requirements: string | null;
  budget_code: string | null;
  urgency_justification: string | null;
  is_resubmission: boolean;
  resubmission_count: number;
  last_returned_at: string | null;
  last_resubmitted_at: string | null;
  regional_evaluation_notes: string | null;
  regional_decision_reason: string | null;
  defer_reason: string | null;
  defer_until: string | null;
  merged_into_request_id: string | null;
  regional_evaluated_by_id: number | null;
  regional_evaluated_at: string | null;
  therapy_alignment_status: TherapyAlignmentStatus;
  therapy_alignment_summary: string | null;
  therapy_alignment_checklist_json?: Record<string, unknown> | unknown[] | null;
  therapy_alignment_completed_by_id: number | null;
  therapy_alignment_completed_at: string | null;
  medical_approved_by_id?: number | null;
  medical_approved_at?: string | null;
  medical_decision_notes?: string | null;
  medical_revision_requested_by_id?: number | null;
  medical_revision_requested_at?: string | null;
  medical_revision_reason?: string | null;
  medical_revision_notes?: string | null;
  medical_revision_count?: number;
  medical_resubmission_count?: number;
  status: MaterialRequestStatus;
  current_status?: string;
  current_owner_label?: string | null;
  next_action_label?: string | null;
  therapy_lead_draft_task?: WorkflowTaskSummary | null;
  has_content_workspace?: boolean;
  primary_content_workspace?: ContentWorkspaceSummary | null;
  linked_content_workspaces?: ContentWorkspaceSummary[];
  current_draft_version?: ContentWorkspaceCurrentVersion | null;
  draft_versions_count?: number;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  region?: Region | null;
  country?: Country | null;
  brand?: Brand | null;
  product?: Product | null;
  therapeutic_area?: TherapeuticArea | null;
  sub_therapy_area?: SubTherapyArea | null;
  campaign?: Campaign | null;
  requested_by?: MaterialRequestUser | null;
  assigned_therapy_lead?: MaterialRequestUser | null;
  assigned_marketing_manager?: MaterialRequestUser | null;
  regional_evaluated_by?: MaterialRequestUser | null;
  therapy_alignment_completed_by?: MaterialRequestUser | null;
  medical_approved_by?: MaterialRequestUser | null;
  medical_revision_requested_by?: MaterialRequestUser | null;
  material_type?: DocumentType | null;
  target_audience?: Audience | null;
  channel?: Channel | null;
  reference_materials?: ContentRequestReferenceMaterial[];
  open_therapy_alignment_comment_count?: number;
  latest_therapy_alignment_comments?: TherapyAlignmentCommentSummary[];
  medical_submission_readiness?: MedicalSubmissionReadiness;
  medical_review_task_summary?: WorkflowTaskSummary | null;
  submitted_medical_version?: ContentWorkspaceCurrentVersion | null;
  therapy_medical_revision_task?: WorkflowTaskSummary | null;
  active_design_brief?: DesignBriefSummary | null;
  design_task_summary?: WorkflowTaskSummary | null;
  design_review_task_summary?: WorkflowTaskSummary | null;
  latest_design_draft?: Record<string, unknown> | null;
  design_decision_summary?: Record<string, unknown> | null;
  can_create_design_brief?: boolean;
  can_submit_design_brief?: boolean;
  medical_review_status?: string | null;
  medical_decision_summary?: Record<string, unknown> | null;
  active_regional_amendment?: ContentRequestRegionalAmendment | null;
  regional_amendment_history?: ContentRequestRegionalAmendment[];
  revision_cycle_summary?: Record<string, unknown> | null;
  can_regional_edit?: boolean;
  can_return_with_regional_edits?: boolean;
  can_spoc_accept_regional_edits?: boolean;
  can_spoc_resubmit_after_regional_edits?: boolean;
  ui_visibility?: ContentRequestUiVisibility | null;
};


export type MaterialRequestCreatePayload = {
  title?: string | null;
  request_title?: string | null;
  description?: string | null;
  brief_description?: string | null;
  region_id?: number | null;
  country_id?: number | null;
  primary_country_id?: number | null;
  brand_id?: number | null;
  product_id?: number | null;
  therapeutic_area_id?: number | null;
  therapy_area_id?: number | null;
  sub_therapy_area_id?: number | null;
  campaign_id?: number | null;
  assigned_therapy_lead_id?: number | null;
  assigned_marketing_manager_id?: number | null;
  material_type_id?: number | null;
  content_type_id?: number | null;
  target_audience_id?: number | null;
  target_audience_ids?: number[];
  additional_country_ids?: number[];
  channel_id?: number | null;
  priority?: string;
  business_objective?: string | null;
  key_messages?: string | null;
  target_hcp_specialty?: string | null;
  required_by_date?: string | null;
  in_market_date?: string | null;
  estimated_quantity?: number | null;
  budget_allocated?: number | null;
  currency_code?: string | null;
  reference_notes?: string | null;
  local_requirements?: string | null;
  budget_code?: string | null;
  urgency_justification?: string | null;
};


export type MaterialRequestUpdatePayload = Partial<MaterialRequestCreatePayload>;


export type ContentRequestFormDraft = {
  payload: MaterialRequestCreatePayload;
  updated_at: string;
  expires_at: string | null;
};


export type MaterialRequestHistory = {
  id: string;
  request_id: string;
  from_status: MaterialRequestStatus | null;
  to_status: MaterialRequestStatus;
  action: string;
  comment: string | null;
  metadata?: Record<string, unknown> | null;
  changed_by_id: number;
  created_at: string;
  changed_by?: MaterialRequestUser | null;
};


export type ContentRequestRevisionCycleStatus =
  | "OPEN"
  | "RESUBMITTED"
  | "CLOSED"
  | "CANCELLED";


export type ContentRequestRevisionCycle = {
  id: string;
  request_id: string;
  cycle_number: number;
  stage_code: string;
  from_status: MaterialRequestStatus | null;
  to_status: MaterialRequestStatus | null;
  returned_by_user_id: number | null;
  returned_to_user_id: number | null;
  return_reason_code: string | null;
  return_reason_label: string | null;
  return_notes: string;
  required_corrections: string[];
  return_attachment_ids: number[];
  return_attachments: ContentRequestReferenceMaterial[];
  returned_at: string | null;
  spoc_response_notes: string | null;
  spoc_attachment_ids: number[];
  spoc_attachments: ContentRequestReferenceMaterial[];
  resubmitted_by_user_id: number | null;
  resubmitted_at: string | null;
  status: ContentRequestRevisionCycleStatus;
  created_at: string;
  updated_at: string;
  returned_by?: MaterialRequestUser | null;
  returned_to?: MaterialRequestUser | null;
  resubmitted_by?: MaterialRequestUser | null;
};


export type MaterialRequestTransitionPayload = {
  action: MaterialRequestTransitionAction;
  comment?: string | null;
};


export type MaterialRequestListParams = {
  status?: MaterialRequestStatus;
  search?: string;
  region_id?: number;
  country_id?: number;
  brand_id?: number;
  product_id?: number;
  therapeutic_area_id?: number;
  therapy_area_id?: number;
  assigned_therapy_lead_id?: number;
  my_requests?: boolean;
  requested_by_me?: boolean;
  assigned_to_me?: boolean;
  my_groups_only?: boolean;
  pending_regional_review?: boolean;
  returned_to_me?: boolean;
  is_resubmission?: boolean;
  active?: boolean;
  page?: number;
  page_size?: number;
};


export type WorkflowTaskSummary = {
  id: number;
  task_type: string;
  object_type?: string;
  object_id?: string;
  assigned_group_id: number | null;
  assigned_user_id: number | null;
  assigned_group_name?: string | null;
  assigned_user_name?: string | null;
  assigned_group?: { id: number; name: string; code?: string | null } | null;
  assigned_user?: MaterialRequestUser | null;
  status: string;
  due_at: string | null;
  sla_status?: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  started_at?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};


export type ContentRequestActionResponse = {
  request: MaterialRequest;
  task?: WorkflowTaskSummary | null;
  next_task?: WorkflowTaskSummary | null;
  therapy_revision_task?: WorkflowTaskSummary | null;
  medical_review_task?: WorkflowTaskSummary | null;
  revision_cycle?: ContentRequestRevisionCycle | null;
  amendment?: ContentRequestRegionalAmendment | null;
  content_workspace?: ContentWorkspaceSummary | null;
  submitted_version?: ContentWorkspaceCurrentVersion | null;
  next_action?: string | null;
};


export type TherapyLeadTask = {
  task_id: number;
  task_type: string;
  object_type: string;
  request_id: string;
  request_code: string | null;
  request_title: string | null;
  request_status: MaterialRequestStatus;
  status: string;
  product?: { id: number; name: string; code?: string | null } | null;
  country?: { id: number; name: string; code?: string | null } | null;
  region?: { id: number; name: string; code?: string | null } | null;
  therapy_area?: { id: number; name: string; code?: string | null } | null;
  sub_therapy?: { id: number; name: string; code?: string | null } | null;
  in_market_date: string | null;
  due_at: string | null;
  current_action: string;
  action_label?: string | null;
  content_workspace?: ContentWorkspaceSummary | null;
  current_revision_version?: ContentWorkspaceCurrentVersion | null;
  open_mandatory_comment_count?: number;
  reference_issue_count?: number;
  medical_revision_reason?: string | null;
  medical_revision_notes?: string | null;
};


export type MedicalReviewSubmitPayload = {
  submission_notes?: string | null;
  content_workspace_id?: number | null;
  content_version_id?: string | null;
};


export type MedicalReviewApprovePayload = {
  decision_notes?: string | null;
  e_signature?: boolean;
  confirmed_no_open_mandatory_issues?: boolean;
};


export type MedicalReviewRevisionPayload = {
  revision_reason?: MedicalRevisionReason | string | null;
  revision_notes?: string | null;
  revision_due_date?: string | null;
  include_open_comments?: boolean;
};


export type MedicalReviewTask = {
  task_id: number;
  task_type: string;
  object_type: string;
  request_id: string;
  request_code: string | null;
  request_title: string | null;
  request_status: MaterialRequestStatus;
  status: string;
  product?: { id: number; name: string; code?: string | null } | null;
  country?: { id: number; name: string; code?: string | null } | null;
  region?: { id: number; name: string; code?: string | null } | null;
  therapy_area?: { id: number; name: string; code?: string | null } | null;
  sub_therapy?: { id: number; name: string; code?: string | null } | null;
  content_workspace_id: number | null;
  content_workspace_code: string | null;
  content_workspace_title: string | null;
  content_version_id: string | null;
  draft_version?: {
    id: string | null;
    version_number: number | null;
    version_label: string | null;
    status: string | null;
  } | null;
  due_at: string | null;
  assigned_user_id: number | null;
  assigned_group_id: number | null;
  open_mandatory_comment_count?: number;
  reference_issue_count?: number;
  action: string;
};


export type MedicalReviewDraftFile = {
  id: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  version_number?: number | null;
  asset_type?: string | null;
  is_primary?: boolean | null;
  download_url?: string | null;
};


export type MedicalReviewDraftVersionContext = {
  id: string;
  revision_source_version_id?: string | null;
  request_id: string | null;
  document_id: number | null;
  asset_id: number | null;
  version_number: number;
  version_label: string | null;
  version_type: string | null;
  status: string;
  content_stage: string | null;
  draft_notes: string | null;
  change_summary: string | null;
  content_html: string | null;
  plain_text: string | null;
  authoring_mode: "FILE_UPLOAD" | "INTERNAL_EDITOR" | "HYBRID";
  file_format: string | null;
  thumbnail_url: string | null;
  dimensions: string | null;
  is_current: boolean;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  asset?: MedicalReviewDraftFile | null;
  created_by?: MaterialRequestUser | null;
};


export type MedicalReviewContext = {
  request: MaterialRequest;
  regional_evaluation: {
    notes: string | null;
    decision_reason: string | null;
    evaluated_by?: MaterialRequestUser | null;
    evaluated_at: string | null;
  };
  therapy_alignment: {
    status: TherapyAlignmentStatus;
    summary: string | null;
    checklist?: Record<string, unknown> | unknown[] | null;
    completed_by?: MaterialRequestUser | null;
    completed_at: string | null;
    comments: TherapyAlignmentCommentSummary[];
  };
  content_workspace: ContentWorkspaceSummary | null;
  submitted_version: MedicalReviewDraftVersionContext | null;
  reference_materials: ContentRequestReferenceMaterial[];
  medical_comments: MedicalReviewComment[];
  medical_reference_validations: MedicalReferenceValidation[];
  medical_review_readiness: MedicalReviewReadiness;
  medical_decision_readiness: MedicalDecisionReadiness;
  task: WorkflowTaskSummary | null;
  therapy_revision_task_summary?: WorkflowTaskSummary | null;
  can_start_medical_review: boolean;
  can_add_medical_comments: boolean;
  can_attach_medical_references: boolean;
  can_decide_medical_review: boolean;
  next_action?: string | null;
  current_stage: string;
  current_status: string;
};


export type MedicalRevisionContext = {
  request: MaterialRequest;
  content_workspace: ContentWorkspaceSummary | null;
  medical_reviewed_version: MedicalReviewDraftVersionContext | null;
  medical_comments: MedicalReviewComment[];
  open_mandatory_comments: MedicalReviewComment[];
  optional_comments: MedicalReviewComment[];
  resolved_comments: MedicalReviewComment[];
  reference_validations: MedicalReferenceValidation[];
  reference_issues: MedicalReferenceValidation[];
  medical_revision: {
    revision_requested_by_id?: number | null;
    revision_requested_by?: MaterialRequestUser | null;
    revision_requested_at?: string | null;
    revision_reason?: string | null;
    revision_notes?: string | null;
  };
  task: WorkflowTaskSummary | null;
  can_start_revision: boolean;
  can_create_revised_version: boolean;
  can_resubmit_medical_review: boolean;
  medical_reviewer_assignment?: MedicalSubmissionReadiness["medical_reviewer_assignment"] | null;
  blocking_reasons: string[];
};


export type MedicalRevisionResubmitPayload = {
  content_version_id?: string | null;
  resubmission_notes: string;
  addressed_comments_summary?: string | null;
};


export type RegionalReasonPayload = {
  reason: string;
};


export type RegionalModificationPayload = {
  return_reason_code: string;
  return_reason_label?: string | null;
  return_notes: string;
  required_corrections?: string[];
  return_attachment_ids?: number[];
};


export type RegionalEditDraftPayload = {
  edited_fields: Record<string, unknown>;
};


export type RegionalEditReturnToSpocPayload = {
  amendment_id?: string | null;
  edited_fields?: Record<string, unknown>;
  reason_category?: string | null;
  return_notes: string;
  required_corrections?: string[];
};


export type ContentRequestResubmitPayload = {
  spoc_response_notes?: string | null;
  spoc_attachment_ids?: number[];
};


export type SpocResubmitAfterRegionalEditsPayload = {
  response_notes: string;
  spoc_attachment_ids?: number[];
};


export type RegionalDeferPayload = {
  defer_reason: string;
  defer_until: string;
};


export type RegionalMergePayload = {
  merged_into_request_id: string;
  reason: string;
};


export type PaginatedMaterialRequestsResponse = {
  items: MaterialRequest[];
  total: number;
  page: number;
  page_size: number;
};

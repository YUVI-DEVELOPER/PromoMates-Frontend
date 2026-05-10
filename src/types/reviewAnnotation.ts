export type ReviewAnnotationType =
  | "GENERAL"
  | "CLAIM"
  | "SAFETY"
  | "REFERENCE"
  | "COPY"
  | "DESIGN"
  | "COMPLIANCE"
  | "MEDICAL"
  | "LEGAL"
  | "REGULATORY"
  | "OTHER";


export type ReviewAnnotationStatus =
  | "OPEN"
  | "RESOLVED"
  | "REOPENED"
  | "DISMISSED";


export type ReviewStage =
  | "MEDICAL_CONTENT_REVIEW"
  | "THERAPY_DESIGN_REVIEW"
  | "PROOF_READING"
  | "FORMAL_MLR_REVIEW";


export type ReviewAnnotationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";


export type ReviewAnnotationAnchorType =
  | "DOCUMENT_BOX"
  | "DOCUMENT_PIN"
  | "TEXT_SELECTION"
  | "VIDEO_TIMESTAMP"
  | "GENERAL";


export const reviewAnnotationTypeLabels: Record<ReviewAnnotationType, string> = {
  GENERAL: "General",
  CLAIM: "Claim",
  SAFETY: "Safety",
  REFERENCE: "Reference",
  COPY: "Copy",
  DESIGN: "Design",
  COMPLIANCE: "Compliance",
  MEDICAL: "Medical",
  LEGAL: "Legal",
  REGULATORY: "Regulatory",
  OTHER: "Other",
};


export const reviewAnnotationTypeOptions: Array<{ value: ReviewAnnotationType; label: string }> = [
  { value: "GENERAL", label: reviewAnnotationTypeLabels.GENERAL },
  { value: "CLAIM", label: reviewAnnotationTypeLabels.CLAIM },
  { value: "SAFETY", label: reviewAnnotationTypeLabels.SAFETY },
  { value: "REFERENCE", label: reviewAnnotationTypeLabels.REFERENCE },
  { value: "COPY", label: reviewAnnotationTypeLabels.COPY },
  { value: "DESIGN", label: reviewAnnotationTypeLabels.DESIGN },
  { value: "COMPLIANCE", label: reviewAnnotationTypeLabels.COMPLIANCE },
  { value: "MEDICAL", label: reviewAnnotationTypeLabels.MEDICAL },
  { value: "LEGAL", label: reviewAnnotationTypeLabels.LEGAL },
  { value: "REGULATORY", label: reviewAnnotationTypeLabels.REGULATORY },
  { value: "OTHER", label: reviewAnnotationTypeLabels.OTHER },
];


export const reviewAnnotationStatusLabels: Record<ReviewAnnotationStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
  DISMISSED: "Dismissed",
};


export type ReviewAnnotation = {
  id: string;
  request_id: string | null;
  content_workspace_id?: number | null;
  document_id: number | null;
  content_version_id: string | null;
  design_draft_id?: string | null;
  file_asset_id?: number | null;
  asset_id: number | null;
  review_task_id: number | null;
  workflow_task_id?: number | null;
  review_stage?: ReviewStage;
  task_type?: string | null;
  author_id?: number;
  reviewer_id: number;
  assigned_to_id?: number | null;
  stage_code?: string | null;
  category?: string | null;
  comment_category?: string | null;
  severity?: ReviewAnnotationSeverity | null;
  annotation_type: ReviewAnnotationType;
  element_reference: string | null;
  comment_text: string;
  is_mandatory?: boolean;
  is_mandatory_change: boolean;
  anchor_type: ReviewAnnotationAnchorType | null;
  page_number: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  normalized: boolean;
  timestamp_seconds: number | null;
  selected_text: string | null;
  shape_data: Record<string, unknown> | null;
  render_context: Record<string, unknown> | null;
  preview_source: string | null;
  status: ReviewAnnotationStatus;
  resolved_by_id: number | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string | null;
  resolved_by_name?: string | null;
  content_version_label?: string | null;
  asset_filename?: string | null;
};


export type ReviewAnnotationCreatePayload = {
  request_id?: string | null;
  content_workspace_id?: number | null;
  document_id?: number | null;
  content_version_id?: string | null;
  design_draft_id?: string | null;
  file_asset_id?: number | null;
  asset_id?: number | null;
  review_task_id?: number | null;
  workflow_task_id?: number | null;
  review_stage?: ReviewStage | null;
  task_type?: string | null;
  category?: string | null;
  comment_category?: string | null;
  severity?: ReviewAnnotationSeverity | null;
  annotation_type: ReviewAnnotationType;
  element_reference?: string | null;
  comment_text: string;
  is_mandatory?: boolean;
  is_mandatory_change: boolean;
  assigned_to_id?: number | null;
  anchor_type?: ReviewAnnotationAnchorType | null;
  page_number?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  normalized?: boolean;
  timestamp_seconds?: number | null;
  selected_text?: string | null;
  shape_data?: Record<string, unknown> | null;
  render_context?: Record<string, unknown> | null;
  preview_source?: string | null;
};


export type ReviewAnnotationUpdatePayload = {
  annotation_type?: ReviewAnnotationType;
  element_reference?: string | null;
  comment_text?: string | null;
  is_mandatory?: boolean;
  is_mandatory_change?: boolean;
  category?: string | null;
  comment_category?: string | null;
  severity?: ReviewAnnotationSeverity | null;
  anchor_type?: ReviewAnnotationAnchorType | null;
  file_asset_id?: number | null;
  asset_id?: number | null;
  page_number?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  normalized?: boolean;
  timestamp_seconds?: number | null;
  selected_text?: string | null;
  shape_data?: Record<string, unknown> | null;
  render_context?: Record<string, unknown> | null;
  preview_source?: string | null;
  status?: ReviewAnnotationStatus;
};


export type ReviewAnnotationResolvePayload = {
  resolution_note?: string | null;
};


export type ReviewAnnotationListParams = {
  request_id?: string;
  document_id?: number;
  content_version_id?: string;
  asset_id?: number;
  review_task_id?: number;
  reviewer_id?: number;
  review_stage?: ReviewStage;
  category?: string;
  status?: ReviewAnnotationStatus;
  mandatory_only?: boolean;
  page?: number;
  page_size?: number;
};


export type ReviewAnnotationListResponse = {
  items: ReviewAnnotation[];
  total: number;
  page: number;
  page_size: number;
};


export type DesignReviewAnnotationCreatePayload = {
  design_draft_id?: string | null;
  file_asset_id?: number | null;
  content_version_id?: string | null;
  page_number?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  selected_text?: string | null;
  comment_text: string;
  category?: string | null;
  severity?: ReviewAnnotationSeverity | null;
  is_mandatory?: boolean;
  assigned_to_id?: number | null;
  annotation_type?: ReviewAnnotationType;
  element_reference?: string | null;
  anchor_type?: ReviewAnnotationAnchorType | null;
  normalized?: boolean;
  timestamp_seconds?: number | null;
  shape_data?: Record<string, unknown> | null;
  render_context?: Record<string, unknown> | null;
  preview_source?: string | null;
};

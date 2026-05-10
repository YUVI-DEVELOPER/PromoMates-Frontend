import type { MaterialRequest, MaterialRequestUser } from "./materialRequest";


export type CollaborationStageCode =
  | "THERAPY_ALIGNMENT"
  | "MEDICAL_CLARIFICATION"
  | "DESIGN_CLARIFICATION"
  | "MLR_CLARIFICATION"
  | "COUNTRY_CUSTOMIZATION";


export type CollaborationTopicCode =
  | "KEY_MESSAGES"
  | "POSITIONING"
  | "TARGET_AUDIENCE"
  | "LOCAL_REQUIREMENTS"
  | "REFERENCE_MATERIALS"
  | "CLAIMS"
  | "OTHER";


export type CollaborationVisibility = "SHARED" | "INTERNAL_THERAPY" | "ADMIN_ONLY";


export type CollaborationCommentStatus = "OPEN" | "RESOLVED";


export type ContentCollaborationComment = {
  id: string;
  request_id: string;
  content_workspace_id: number | null;
  content_version_id: string | null;
  stage_code: CollaborationStageCode | string;
  topic_code: CollaborationTopicCode | string;
  comment_text: string;
  parent_comment_id: string | null;
  visibility: CollaborationVisibility | string;
  status: CollaborationCommentStatus | string;
  is_decision_note: boolean;
  created_by?: MaterialRequestUser | null;
  created_at: string;
  resolved_by?: MaterialRequestUser | null;
  resolved_at: string | null;
};


export type ContentCollaborationCommentCreatePayload = {
  content_workspace_id?: number | null;
  content_version_id?: string | null;
  stage_code?: CollaborationStageCode;
  topic_code: CollaborationTopicCode;
  comment_text: string;
  parent_comment_id?: string | null;
  visibility?: CollaborationVisibility;
  is_decision_note?: boolean;
};


export type TherapyAlignmentCompletePayload = {
  alignment_summary: string;
  checklist_json?: Record<string, boolean> | null;
};


export type TherapyAlignmentCompleteResponse = MaterialRequest;

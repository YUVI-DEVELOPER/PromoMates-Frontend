import type { DocumentReference, DocumentUser } from "./document";
import type { Workflow } from "./workflow";
import type { Role } from "./user";


export type ReviewStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";


export type ReviewTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "SKIPPED";


export type ReviewDecision = "APPROVE" | "CHANGES_REQUESTED" | "REJECT";


export type ReviewTaskDocument = {
  id: number;
  document_number?: string;
  title?: string;
  status?: string;
};


export type ReviewTask = {
  id: number;
  review_id: number;
  document_id: number;
  workflow_stage_id: number | null;
  stage_order: number;
  stage_name: string;
  required_role_id: number | null;
  required_role: string | null;
  required_role_ref: Role | null;
  required_group_id: number | null;
  required_group_name?: string | null;
  assignee_id: number | null;
  status: ReviewTaskStatus;
  due_date: string;
  decision: ReviewDecision | null;
  decision_comment: string | null;
  decided_by_id: number | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: DocumentUser | null;
  decided_by?: DocumentUser | null;
  document?: ReviewTaskDocument | null;
};


export type Review = {
  id: number;
  document_id: number;
  workflow_id: number;
  status: ReviewStatus;
  submitted_by_id: number;
  submitted_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  submitted_by?: DocumentUser | null;
  workflow?: Workflow | DocumentReference | null;
  tasks?: ReviewTask[];
};


export type SubmitReviewPayload = {
  workflow_id?: number | null;
  comment?: string | null;
};


export type SubmitReviewResponse = {
  review: Review;
  tasks: ReviewTask[];
};


export type TaskDecisionPayload = {
  decision: ReviewDecision;
  decision_comment?: string | null;
};


export type TaskAssignPayload = {
  assignee_id: number;
};


export type ReviewListParams = {
  status?: ReviewStatus;
  document_id?: number;
  submitted_by_id?: number;
  page?: number;
  page_size?: number;
};


export type TaskListParams = {
  status?: ReviewTaskStatus;
  assigned_to_me?: boolean;
  required_role_id?: number;
  document_id?: number;
  review_id?: number;
  page?: number;
  page_size?: number;
};


export type PaginatedReviewsResponse = {
  items: Review[];
  total: number;
  page: number;
  page_size: number;
};


export type PaginatedTasksResponse = {
  items: ReviewTask[];
  total: number;
  page: number;
  page_size: number;
};

import type { Role } from "./user";


export type WorkflowStage = {
  id: number;
  workflow_id: number;
  stage_order: number;
  name: string;
  required_role_id: number | null;
  required_role: string | null;
  required_role_ref: Role | null;
  required_group_id: number | null;
  required_group_name?: string | null;
  due_days: number;
  is_required: boolean;
  allow_parallel: boolean;
  created_at: string;
  updated_at: string;
};


export type Workflow = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  stage_count?: number;
  created_by_id: number;
  updated_by_id: number;
  created_at: string;
  updated_at: string;
  stages?: WorkflowStage[];
};


export type WorkflowListParams = {
  include_inactive?: boolean;
};


export type WorkflowCreatePayload = {
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  is_default: boolean;
};


export type WorkflowUpdatePayload = {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  is_default?: boolean;
};


export type WorkflowStageCreatePayload = {
  stage_order: number;
  name: string;
  required_role_id: number;
  required_group_id?: number | null;
  due_days: number;
  is_required: boolean;
  allow_parallel: boolean;
};


export type WorkflowStageUpdatePayload = Partial<WorkflowStageCreatePayload>;

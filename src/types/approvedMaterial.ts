import type { MaterialRequestUser } from "./materialRequest";


export type ApprovedMaterialStatus =
  | "ACTIVE"
  | "WITHDRAWN"
  | "EXPIRED"
  | "SUPERSEDED";


export const approvedMaterialStatusLabels: Record<ApprovedMaterialStatus, string> = {
  ACTIVE: "Active",
  WITHDRAWN: "Withdrawn",
  EXPIRED: "Expired",
  SUPERSEDED: "Superseded",
};


export type ApprovedMaterial = {
  id: string;
  request_id: string;
  source_document_id: number | null;
  source_design_job_id: string | null;
  final_content_version_id: string;
  compliance_record_id: string;
  material_code: string;
  material_title: string;
  mlr_code: string | null;
  approved_by_id: number;
  approval_date: string;
  valid_from: string;
  valid_until: string;
  approved_region_ids: number[] | null;
  approved_channel_ids: number[] | null;
  digital_asset_id: number | null;
  print_ready_asset_id: number | null;
  status: ApprovedMaterialStatus;
  is_locked: boolean;
  withdrawn_at: string | null;
  withdrawn_by_id: number | null;
  withdrawal_reason: string | null;
  created_at: string;
  updated_at: string;
  request_number?: string | null;
  request_title?: string | null;
  document_number?: string | null;
  final_content_version_label?: string | null;
  final_asset_filename?: string | null;
  digital_asset_filename?: string | null;
  print_ready_asset_filename?: string | null;
  compliance_mlr_code?: string | null;
  approved_by_name?: string | null;
  is_expired?: boolean;
};


export type ApprovedMaterialHistory = {
  id: string;
  approved_material_id: string;
  request_id: string;
  action: string;
  comment: string | null;
  from_status: ApprovedMaterialStatus | null;
  to_status: ApprovedMaterialStatus | null;
  changed_by_id: number;
  created_at: string;
  changed_by?: MaterialRequestUser | null;
};


export type ApprovedMaterialListParams = {
  request_id?: string;
  status?: ApprovedMaterialStatus;
  search?: string;
  valid_only?: boolean;
  region_id?: number;
  channel_id?: number;
  page?: number;
  page_size?: number;
};


export type ApprovedMaterialListResponse = {
  items: ApprovedMaterial[];
  total: number;
  page: number;
  page_size: number;
};


export type FinalApprovalPayload = {
  final_content_version_id?: string | null;
  compliance_record_id?: string | null;
  material_title?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  digital_asset_id?: number | null;
  print_ready_asset_id?: number | null;
  comment?: string | null;
};


export type WithdrawApprovedMaterialPayload = {
  reason: string;
};

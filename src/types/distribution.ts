import type { ApprovedMaterialStatus } from "./approvedMaterial";
import type { MaterialRequestUser } from "./materialRequest";
import type { UserGroupOption } from "./userGroup";


export type DistributionPackageStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RELEASED"
  | "EXPIRED"
  | "WITHDRAWN";


export type SalesMaterialAccessType = "VIEW" | "DOWNLOAD" | "SHARE";


export const distributionPackageStatusLabels: Record<DistributionPackageStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  RELEASED: "Released",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};


export type PackageMaterial = {
  package_id: string;
  material_id: string;
  sort_order: number;
  usage_notes: string | null;
  added_by_id: number | null;
  added_at: string;
  material_code: string | null;
  material_title: string | null;
  mlr_code: string | null;
  valid_until: string | null;
  status: ApprovedMaterialStatus | null;
  package_name?: string | null;
  package_status?: DistributionPackageStatus | null;
  package_usage_instructions?: string | null;
};


export type DistributionPackage = {
  id: string;
  package_name: string;
  campaign_id: number | null;
  campaign_name?: string | null;
  created_by_id: number;
  target_region_ids: number[] | null;
  target_user_ids: number[] | null;
  target_groups: UserGroupOption[];
  release_date: string | null;
  expiry_date: string | null;
  usage_instructions: string | null;
  status: DistributionPackageStatus;
  released_at: string | null;
  released_by_id: number | null;
  withdrawn_at: string | null;
  withdrawn_by_id: number | null;
  withdrawal_reason: string | null;
  created_at: string;
  updated_at: string;
  material_count: number;
  created_by_name?: string | null;
  released_by_name?: string | null;
  is_currently_available: boolean;
  materials?: PackageMaterial[];
};


export type DistributionPackageHistory = {
  id: string;
  package_id: string;
  action: string;
  comment: string | null;
  from_status: DistributionPackageStatus | null;
  to_status: DistributionPackageStatus | null;
  changed_by_id: number;
  created_at: string;
  changed_by?: MaterialRequestUser | null;
};


export type SalesRepAccess = {
  id: string;
  material_id: string;
  material_code: string | null;
  user_id: number;
  user_name: string | null;
  package_id: string | null;
  access_type: SalesMaterialAccessType;
  accessed_at: string;
  device_type: string | null;
  hcp_call_id: string | null;
  acknowledged_terms: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
};


export type DistributionPackageCreatePayload = {
  package_name: string;
  campaign_id?: number | null;
  target_region_ids?: number[] | null;
  target_user_ids?: number[] | null;
  group_ids?: number[] | null;
  release_date?: string | null;
  expiry_date?: string | null;
  usage_instructions?: string | null;
};


export type DistributionPackageUpdatePayload = Partial<DistributionPackageCreatePayload> & {
  status?: DistributionPackageStatus | null;
};


export type DistributionPackageTransitionPayload = {
  comment?: string | null;
  reason?: string | null;
  release_date?: string | null;
  expiry_date?: string | null;
};


export type PackageMaterialCreatePayload = {
  material_id: string;
  sort_order?: number;
  usage_notes?: string | null;
};


export type PackageMaterialUpdatePayload = {
  sort_order?: number | null;
  usage_notes?: string | null;
};


export type RecordSalesAccessPayload = {
  package_id?: string | null;
  access_type: SalesMaterialAccessType;
  device_type?: string | null;
  hcp_call_id?: string | null;
  acknowledged_terms?: boolean;
};


export type DistributionPackageListParams = {
  status?: DistributionPackageStatus;
  campaign_id?: number;
  search?: string;
  released_only?: boolean;
  created_by_me?: boolean;
  available_to_me?: boolean;
  page?: number;
  page_size?: number;
};


export type DistributionPackageListResponse = {
  items: DistributionPackage[];
  total: number;
  page: number;
  page_size: number;
};


export type SalesRepAccessListParams = {
  material_id?: string;
  user_id?: number;
  package_id?: string;
  access_type?: SalesMaterialAccessType;
  date_from?: string;
  date_to?: string;
};

export type DocumentStatus =
  | "DRAFT"
  | "DRAFT_IN_PROGRESS"
  | "SUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_REVIEW_IN_PROGRESS"
  | "MEDICAL_REVISION_REQUIRED"
  | "MEDICAL_REVISION_IN_PROGRESS"
  | "RESUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_CONTENT_APPROVED"
  | "DESIGN_BRIEF_SUBMITTED"
  | "DESIGN_IN_PROGRESS"
  | "DESIGN_DRAFT_UPLOADED"
  | "READY_FOR_REVIEW"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "WITHDRAWN";


export type DocumentReference = {
  id: number;
  name: string;
  code: string;
};


export type DocumentUser = {
  id: number;
  full_name: string;
  email: string;
};


export type DocumentMaterialRequest = {
  id: string;
  request_number: string;
  title: string;
  status: string;
  requested_by_id: number;
};


export type DocumentListItem = {
  id: number;
  document_number: string;
  content_code?: string | null;
  title: string;
  description: string | null;
  status: DocumentStatus;
  owner_id: number;
  created_by_id: number;
  updated_by_id: number;
  request_id: string | null;
  region_id: number | null;
  brand_id: number;
  product_id: number;
  country_id: number;
  therapeutic_area_id: number | null;
  sub_therapy_area_id: number | null;
  language_id: number;
  document_type_id: number;
  content_type_id?: number | null;
  document_subtype_id: number | null;
  channel_id: number | null;
  audience_id: number | null;
  intended_use: string | null;
  keywords: string | null;
  expiry_date: string | null;
  is_content_workspace: boolean;
  is_primary_content_workspace: boolean;
  is_active?: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  owner?: DocumentUser | null;
  material_request?: DocumentMaterialRequest | null;
  region?: DocumentReference | null;
  brand?: DocumentReference | null;
  product?: DocumentReference | null;
  country?: DocumentReference | null;
  therapeutic_area?: DocumentReference | null;
  sub_therapy_area?: DocumentReference | null;
  language?: DocumentReference | null;
  document_type?: DocumentReference | null;
};


export type DocumentDetail = DocumentListItem & {
  document_subtype?: DocumentReference | null;
  channel?: DocumentReference | null;
  audience?: DocumentReference | null;
  created_by?: DocumentUser | null;
  updated_by?: DocumentUser | null;
};


export type DocumentCreatePayload = {
  title: string;
  description?: string | null;
  request_id?: string | null;
  brand_id: number;
  product_id: number;
  country_id: number;
  language_id: number;
  document_type_id: number;
  document_subtype_id?: number | null;
  channel_id?: number | null;
  audience_id?: number | null;
  intended_use?: string | null;
  keywords?: string | null;
  expiry_date?: string | null;
};


export type DocumentUpdatePayload = Partial<DocumentCreatePayload>;


export type DocumentStatusUpdatePayload = {
  to_status: DocumentStatus;
  reason?: string | null;
};


export type DocumentVersion = {
  id: number;
  document_id: number;
  version_number: number;
  title_snapshot: string;
  metadata_snapshot: Record<string, unknown>;
  created_by_id: number;
  created_at: string;
  created_by?: DocumentUser | null;
};


export type DocumentStateHistory = {
  id: number;
  document_id: number;
  from_status: DocumentStatus | null;
  to_status: DocumentStatus;
  changed_by_id: number;
  reason: string | null;
  created_at: string;
  changed_by?: DocumentUser | null;
};


export type DocumentListParams = {
  search?: string;
  status?: DocumentStatus;
  brand_id?: number;
  product_id?: number;
  country_id?: number;
  document_type_id?: number;
  request_id?: string;
  owner_id?: number;
  include_deleted?: boolean;
  page?: number;
  page_size?: number;
};


export type PaginatedDocumentsResponse = {
  items: DocumentListItem[];
  total: number;
  page: number;
  page_size: number;
};

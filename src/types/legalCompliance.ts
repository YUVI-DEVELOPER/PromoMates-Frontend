export type LegalComplianceDecision =
  | "PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";


export type LegalComplianceStatus =
  | "DRAFT"
  | "CHECKLIST_IN_PROGRESS"
  | "READY_FOR_CODE"
  | "CODE_ISSUED"
  | "SUPERSEDED"
  | "WITHDRAWN";


export const legalComplianceDecisionLabels: Record<LegalComplianceDecision, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes Requested",
  REJECTED: "Rejected",
};


export const legalComplianceStatusLabels: Record<LegalComplianceStatus, string> = {
  DRAFT: "Draft",
  CHECKLIST_IN_PROGRESS: "Checklist In Progress",
  READY_FOR_CODE: "Ready For Code",
  CODE_ISSUED: "Code Issued",
  SUPERSEDED: "Superseded",
  WITHDRAWN: "Withdrawn",
};


export type LegalComplianceRecord = {
  id: string;
  request_id: string | null;
  document_id: number | null;
  content_version_id: string;
  reviewed_by_id: number | null;
  issued_by_id: number | null;
  regulatory_framework: string | null;
  claims_verified: boolean;
  fair_balance_present: boolean;
  pi_references_accurate: boolean;
  safety_information_included: boolean;
  black_box_warning_included: boolean;
  off_label_risk_flag: boolean;
  country_specific_reqs_met: boolean;
  references_verified: boolean;
  mandatory_annotations_resolved: boolean;
  mlr_code: string | null;
  mlr_decision: LegalComplianceDecision;
  record_status: LegalComplianceStatus;
  mlr_decision_date: string | null;
  valid_from: string | null;
  expiry_date: string | null;
  compliance_notes: string | null;
  created_at: string;
  updated_at: string;
  request_number?: string | null;
  document_number?: string | null;
  content_version_label?: string | null;
  asset_filename?: string | null;
  reviewed_by_name?: string | null;
  issued_by_name?: string | null;
};


export type LegalComplianceRecordCreatePayload = {
  request_id?: string | null;
  document_id?: number | null;
  content_version_id: string;
  regulatory_framework?: string | null;
  claims_verified?: boolean;
  fair_balance_present?: boolean;
  pi_references_accurate?: boolean;
  safety_information_included?: boolean;
  black_box_warning_included?: boolean;
  off_label_risk_flag?: boolean;
  country_specific_reqs_met?: boolean;
  references_verified?: boolean;
  mandatory_annotations_resolved?: boolean;
  compliance_notes?: string | null;
};


export type LegalComplianceRecordUpdatePayload = {
  regulatory_framework?: string | null;
  claims_verified?: boolean;
  fair_balance_present?: boolean;
  pi_references_accurate?: boolean;
  safety_information_included?: boolean;
  black_box_warning_included?: boolean;
  off_label_risk_flag?: boolean;
  country_specific_reqs_met?: boolean;
  references_verified?: boolean;
  mandatory_annotations_resolved?: boolean;
  compliance_notes?: string | null;
};


export type LegalComplianceRecordIssueCodePayload = {
  valid_from?: string | null;
  expiry_date?: string | null;
  compliance_notes?: string | null;
};


export type LegalComplianceRecordListParams = {
  request_id?: string;
  document_id?: number;
  content_version_id?: string;
  mlr_decision?: LegalComplianceDecision;
  record_status?: LegalComplianceStatus;
  mlr_code?: string;
  page?: number;
  page_size?: number;
};


export type LegalComplianceRecordListResponse = {
  items: LegalComplianceRecord[];
  total: number;
  page: number;
  page_size: number;
};

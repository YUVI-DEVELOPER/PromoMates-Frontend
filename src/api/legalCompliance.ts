import { apiClient } from "./client";
import type {
  LegalComplianceRecord,
  LegalComplianceRecordCreatePayload,
  LegalComplianceRecordIssueCodePayload,
  LegalComplianceRecordListParams,
  LegalComplianceRecordListResponse,
  LegalComplianceRecordUpdatePayload,
} from "../types/legalCompliance";


export async function getComplianceRecords(
  params?: LegalComplianceRecordListParams,
): Promise<LegalComplianceRecordListResponse> {
  const response = await apiClient.get<LegalComplianceRecordListResponse>(
    "/legal-compliance-records",
    { params },
  );
  return response.data;
}


export async function getComplianceRecord(id: string): Promise<LegalComplianceRecord> {
  const response = await apiClient.get<LegalComplianceRecord>(`/legal-compliance-records/${id}`);
  return response.data;
}


export async function createComplianceRecord(
  payload: LegalComplianceRecordCreatePayload,
): Promise<LegalComplianceRecord> {
  const response = await apiClient.post<LegalComplianceRecord>("/legal-compliance-records", payload);
  return response.data;
}


export async function updateComplianceRecord(
  id: string,
  payload: LegalComplianceRecordUpdatePayload,
): Promise<LegalComplianceRecord> {
  const response = await apiClient.put<LegalComplianceRecord>(`/legal-compliance-records/${id}`, payload);
  return response.data;
}


export async function issueMlrCode(
  id: string,
  payload?: LegalComplianceRecordIssueCodePayload,
): Promise<LegalComplianceRecord> {
  const response = await apiClient.post<LegalComplianceRecord>(
    `/legal-compliance-records/${id}/issue-code`,
    payload ?? {},
  );
  return response.data;
}


export async function getRequestComplianceRecords(
  requestId: string,
  params?: Omit<LegalComplianceRecordListParams, "request_id">,
): Promise<LegalComplianceRecordListResponse> {
  const response = await apiClient.get<LegalComplianceRecordListResponse>(
    `/material-requests/${requestId}/compliance-records`,
    { params },
  );
  return response.data;
}


export async function getDocumentComplianceRecords(
  documentId: number,
  params?: Omit<LegalComplianceRecordListParams, "document_id">,
): Promise<LegalComplianceRecordListResponse> {
  const response = await apiClient.get<LegalComplianceRecordListResponse>(
    `/documents/${documentId}/compliance-records`,
    { params },
  );
  return response.data;
}


export async function getContentVersionComplianceRecord(
  contentVersionId: string,
): Promise<LegalComplianceRecord> {
  const response = await apiClient.get<LegalComplianceRecord>(
    `/content-versions/${contentVersionId}/compliance-record`,
  );
  return response.data;
}


export async function getOrCreateContentVersionComplianceRecord(
  contentVersionId: string,
): Promise<LegalComplianceRecord> {
  const response = await apiClient.post<LegalComplianceRecord>(
    `/content-versions/${contentVersionId}/compliance-record`,
  );
  return response.data;
}

import { apiClient } from "./client";
import type {
  ApprovedMaterial,
  ApprovedMaterialHistory,
  ApprovedMaterialListParams,
  ApprovedMaterialListResponse,
  FinalApprovalPayload,
} from "../types/approvedMaterial";


export async function getApprovedMaterials(
  params?: ApprovedMaterialListParams,
): Promise<ApprovedMaterialListResponse> {
  const response = await apiClient.get<ApprovedMaterialListResponse>(
    "/approved-materials",
    { params },
  );
  return response.data;
}


export async function getApprovedMaterial(id: string): Promise<ApprovedMaterial> {
  const response = await apiClient.get<ApprovedMaterial>(`/approved-materials/${id}`);
  return response.data;
}


export async function getApprovedMaterialHistory(id: string): Promise<ApprovedMaterialHistory[]> {
  const response = await apiClient.get<ApprovedMaterialHistory[]>(`/approved-materials/${id}/history`);
  return response.data;
}


export async function getRequestApprovedMaterial(requestId: string): Promise<ApprovedMaterial> {
  const response = await apiClient.get<ApprovedMaterial>(
    `/material-requests/${requestId}/approved-material`,
  );
  return response.data;
}


export async function finalApproveRequest(
  requestId: string,
  payload: FinalApprovalPayload,
): Promise<ApprovedMaterial> {
  const response = await apiClient.post<ApprovedMaterial>(
    `/material-requests/${requestId}/final-approval`,
    payload,
  );
  return response.data;
}


export async function withdrawApprovedMaterial(
  materialId: string,
  reason: string,
): Promise<ApprovedMaterial> {
  const response = await apiClient.post<ApprovedMaterial>(
    `/approved-materials/${materialId}/withdraw`,
    { reason },
  );
  return response.data;
}

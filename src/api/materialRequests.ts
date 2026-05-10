import axios from "axios";
import { apiClient } from "./client";
import type { PaginatedDocumentsResponse } from "../types/document";
import type {
  MaterialRequest,
  ContentRequestFormDraft,
  ContentRequestRegionalAmendment,
  ContentWorkspaceSummary,
  ContentRequestResubmitPayload,
  ContentRequestReferenceMaterial,
  ContentRequestRevisionCycle,
  ContentRequestActionResponse,
  MaterialRequestCreatePayload,
  MaterialRequestHistory,
  MaterialRequestListParams,
  MedicalReferenceValidation,
  MedicalReferenceValidationCreatePayload,
  MedicalReferenceValidationUpdatePayload,
  MedicalReviewApprovePayload,
  MedicalReviewComment,
  MedicalReviewCommentCreatePayload,
  MedicalReviewContext,
  MedicalReviewRevisionPayload,
  MedicalReviewSubmitPayload,
  MedicalReviewTask,
  MedicalRevisionContext,
  MedicalRevisionResubmitPayload,
  RegionalEditDraftPayload,
  RegionalEditReturnToSpocPayload,
  RegionalDeferPayload,
  RegionalMergePayload,
  RegionalModificationPayload,
  RegionalReasonPayload,
  SpocResubmitAfterRegionalEditsPayload,
  MaterialRequestTransitionAction,
  MaterialRequestTransitionPayload,
  MaterialRequestUpdatePayload,
  PaginatedMaterialRequestsResponse,
  TherapyLeadTask,
} from "../types/materialRequest";
import type { SubmitReviewPayload, SubmitReviewResponse } from "../types/review";
import { getStoredAuthToken } from "../utils/authStorage";


export async function getMaterialRequests(
  params?: MaterialRequestListParams,
): Promise<PaginatedMaterialRequestsResponse> {
  const response = await apiClient.get<PaginatedMaterialRequestsResponse>(
    "/content-requests",
    { params },
  );
  return response.data;
}

export async function getMaterialRequestStatusCounts(
  params?: Omit<MaterialRequestListParams, "status" | "page" | "page_size">,
): Promise<{ total: number; statuses: Partial<Record<string, number>> }> {
  const response = await apiClient.get<{ total: number; statuses: Partial<Record<string, number>> }>(
    "/content-requests/status-counts",
    { params },
  );
  return response.data;
}


const MATERIAL_REQUEST_DETAIL_TIMEOUT_MS = 30000;

function isTimeoutError(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.code === "ECONNABORTED" || /timeout/i.test(error.message));
}

export async function getMaterialRequest(id: string): Promise<MaterialRequest> {
  try {
    const response = await apiClient.get<MaterialRequest>(`/content-requests/${id}`, {
      timeout: MATERIAL_REQUEST_DETAIL_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    if (!isTimeoutError(error)) {
      throw error;
    }
    const retryResponse = await apiClient.get<MaterialRequest>(`/content-requests/${id}`, {
      timeout: MATERIAL_REQUEST_DETAIL_TIMEOUT_MS,
    });
    return retryResponse.data;
  }
}


export async function createMaterialRequest(
  payload: MaterialRequestCreatePayload,
): Promise<MaterialRequest> {
  const response = await apiClient.post<MaterialRequest>("/content-requests", payload);
  return response.data;
}


export async function saveMaterialRequestDraft(
  payload: MaterialRequestCreatePayload | MaterialRequestUpdatePayload,
  id?: string | null,
): Promise<MaterialRequest> {
  if (id) {
    const response = await apiClient.patch<MaterialRequest>(`/content-requests/${id}/draft`, payload);
    return response.data;
  }
  const response = await apiClient.post<MaterialRequest>("/content-requests/draft", payload);
  return response.data;
}


export async function getContentRequestFormDraft(): Promise<ContentRequestFormDraft | null> {
  const response = await apiClient.get<ContentRequestFormDraft | null>("/content-requests/drafts/current");
  return response.data;
}


export async function saveContentRequestFormDraft(
  payload: MaterialRequestCreatePayload,
): Promise<ContentRequestFormDraft> {
  const response = await apiClient.put<ContentRequestFormDraft>("/content-requests/drafts/current", { payload });
  return response.data;
}


export async function deleteContentRequestFormDraft(): Promise<void> {
  await apiClient.delete("/content-requests/drafts/current");
}


export function flushContentRequestFormDraft(payload: MaterialRequestCreatePayload): void {
  const token = getStoredAuthToken();
  const baseUrl = apiClient.defaults.baseURL ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  void fetch(`${baseUrl}/content-requests/drafts/current`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ payload }),
    keepalive: true,
  });
}


export async function updateMaterialRequest(
  id: string,
  payload: MaterialRequestUpdatePayload,
): Promise<MaterialRequest> {
  const response = await apiClient.put<MaterialRequest>(`/content-requests/${id}`, payload);
  return response.data;
}


export async function submitMaterialRequest(
  id: string,
  payload?: ContentRequestResubmitPayload,
): Promise<MaterialRequest> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/submit`,
    payload,
  );
  return response.data.request;
}


export async function uploadContentRequestReferenceMaterials(
  id: string,
  files: File[],
): Promise<ContentRequestReferenceMaterial[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await apiClient.post<ContentRequestReferenceMaterial[]>(
    `/content-requests/${id}/reference-materials`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}


export async function deleteContentRequestReferenceMaterial(
  requestId: string,
  materialId: number,
): Promise<ContentRequestReferenceMaterial> {
  const response = await apiClient.delete<ContentRequestReferenceMaterial>(
    `/content-requests/${requestId}/reference-materials/${materialId}`,
  );
  return response.data;
}


export async function downloadContentRequestReferenceMaterial(
  requestId: string,
  material: Pick<ContentRequestReferenceMaterial, "id" | "original_filename">,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/content-requests/${requestId}/reference-materials/${material.id}/download`,
    { responseType: "blob" },
  );
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = material.original_filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}


export async function getContentRequestReferenceMaterialViewerSourceArrayBuffer(
  requestId: string,
  materialId: number,
): Promise<ArrayBuffer> {
  const response = await apiClient.get<ArrayBuffer>(
    `/content-requests/${requestId}/reference-materials/${materialId}/viewer-source`,
    { responseType: "arraybuffer" },
  );
  return response.data;
}


export async function getContentRequestReferenceMaterialViewerSourceBlob(
  requestId: string,
  materialId: number,
): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `/content-requests/${requestId}/reference-materials/${materialId}/viewer-source`,
    { responseType: "blob" },
  );
  return response.data;
}


export async function transitionMaterialRequest(
  id: string,
  action: MaterialRequestTransitionAction,
  comment?: string | null,
): Promise<MaterialRequest> {
  const payload: MaterialRequestTransitionPayload = {
    action,
    comment: comment ?? null,
  };
  const response = await apiClient.post<MaterialRequest>(
    `/material-requests/${id}/transition`,
    payload,
  );
  return response.data;
}


export async function getMaterialRequestHistory(
  id: string,
): Promise<MaterialRequestHistory[]> {
  const response = await apiClient.get<MaterialRequestHistory[]>(
    `/content-requests/${id}/history`,
  );
  return response.data;
}


export async function getTherapyLeadTasks(): Promise<TherapyLeadTask[]> {
  const response = await apiClient.get<TherapyLeadTask[]>("/content-requests/therapy-lead/tasks");
  return response.data;
}


export async function getMedicalReviewTasks(): Promise<MedicalReviewTask[]> {
  const response = await apiClient.get<MedicalReviewTask[]>("/content-requests/medical-review/tasks");
  return response.data;
}


export async function getMedicalReviewContext(id: string): Promise<MedicalReviewContext> {
  const response = await apiClient.get<MedicalReviewContext>(
    `/content-requests/${id}/medical-review/context`,
  );
  return response.data;
}


export async function startMedicalReview(id: string): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/medical-review/start`,
  );
  return response.data;
}


export async function approveMedicalContent(
  id: string,
  payload: MedicalReviewApprovePayload,
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/medical-review/approve`,
    payload,
  );
  return response.data;
}


export async function requestMedicalRevision(
  id: string,
  payload: MedicalReviewRevisionPayload,
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/medical-review/request-revision`,
    payload,
  );
  return response.data;
}


export async function startMedicalRevision(id: string): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/therapy/start-medical-revision`,
  );
  return response.data;
}


export async function getMedicalRevisionContext(id: string): Promise<MedicalRevisionContext> {
  const response = await apiClient.get<MedicalRevisionContext>(
    `/content-requests/${id}/therapy/medical-revision-context`,
  );
  return response.data;
}


export async function resubmitMedicalReview(
  id: string,
  payload: MedicalRevisionResubmitPayload,
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/therapy/resubmit-medical-review`,
    payload,
  );
  return response.data;
}


export async function getMedicalReviewComments(id: string): Promise<MedicalReviewComment[]> {
  const response = await apiClient.get<MedicalReviewComment[]>(
    `/content-requests/${id}/medical-review/comments`,
  );
  return response.data;
}


export async function createMedicalReviewComment(
  id: string,
  payload: MedicalReviewCommentCreatePayload,
): Promise<MedicalReviewComment> {
  const response = await apiClient.post<MedicalReviewComment>(
    `/content-requests/${id}/medical-review/comments`,
    payload,
  );
  return response.data;
}


export async function resolveMedicalReviewComment(
  requestId: string,
  commentId: string,
): Promise<MedicalReviewComment> {
  const response = await apiClient.post<MedicalReviewComment>(
    `/content-requests/${requestId}/medical-review/comments/${commentId}/resolve`,
  );
  return response.data;
}


export async function reopenMedicalReviewComment(
  requestId: string,
  commentId: string,
): Promise<MedicalReviewComment> {
  const response = await apiClient.post<MedicalReviewComment>(
    `/content-requests/${requestId}/medical-review/comments/${commentId}/reopen`,
  );
  return response.data;
}


export async function getMedicalReferenceValidations(id: string): Promise<MedicalReferenceValidation[]> {
  const response = await apiClient.get<MedicalReferenceValidation[]>(
    `/content-requests/${id}/medical-review/reference-validations`,
  );
  return response.data;
}


export async function createMedicalReferenceValidation(
  id: string,
  payload: MedicalReferenceValidationCreatePayload,
): Promise<MedicalReferenceValidation> {
  const response = await apiClient.post<MedicalReferenceValidation>(
    `/content-requests/${id}/medical-review/reference-validations`,
    payload,
  );
  return response.data;
}


export async function updateMedicalReferenceValidation(
  requestId: string,
  validationId: string,
  payload: MedicalReferenceValidationUpdatePayload,
): Promise<MedicalReferenceValidation> {
  const response = await apiClient.patch<MedicalReferenceValidation>(
    `/content-requests/${requestId}/medical-review/reference-validations/${validationId}`,
    payload,
  );
  return response.data;
}


export async function uploadMedicalReviewReferenceMaterials(
  id: string,
  files: File[],
): Promise<ContentRequestReferenceMaterial[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await apiClient.post<ContentRequestReferenceMaterial[]>(
    `/content-requests/${id}/medical-review/references`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}


export async function submitMedicalReview(
  id: string,
  payload: MedicalReviewSubmitPayload = {},
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/therapy/submit-medical-review`,
    payload,
  );
  return response.data;
}


export async function getContentRequestRevisionCycles(
  id: string,
): Promise<ContentRequestRevisionCycle[]> {
  const response = await apiClient.get<ContentRequestRevisionCycle[]>(
    `/content-requests/${id}/revision-cycles`,
  );
  return response.data;
}


export async function getContentRequestRevisionCycle(
  id: string,
  cycleId: string,
): Promise<ContentRequestRevisionCycle> {
  const response = await apiClient.get<ContentRequestRevisionCycle>(
    `/content-requests/${id}/revision-cycles/${cycleId}`,
  );
  return response.data;
}


export async function getRegionalEditDraft(id: string): Promise<ContentRequestRegionalAmendment | null> {
  const response = await apiClient.get<ContentRequestRegionalAmendment | null>(
    `/content-requests/${id}/regional-edit-draft`,
  );
  return response.data;
}


export async function saveRegionalEditDraft(
  id: string,
  payload: RegionalEditDraftPayload,
): Promise<ContentRequestRegionalAmendment> {
  const response = await apiClient.post<ContentRequestRegionalAmendment>(
    `/content-requests/${id}/regional-edit-draft`,
    payload,
  );
  return response.data;
}


export async function returnToSpocWithRegionalEdits(
  id: string,
  payload: RegionalEditReturnToSpocPayload,
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional-edit-return-to-spoc`,
    payload,
  );
  return response.data;
}


export async function getRegionalAmendments(id: string): Promise<ContentRequestRegionalAmendment[]> {
  const response = await apiClient.get<ContentRequestRegionalAmendment[]>(
    `/content-requests/${id}/regional-amendments`,
  );
  return response.data;
}


export async function acceptRegionalEdits(id: string): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/spoc/accept-regional-edits`,
  );
  return response.data;
}


export async function resubmitAfterRegionalEdits(
  id: string,
  payload: SpocResubmitAfterRegionalEditsPayload,
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/spoc/resubmit-after-regional-edits`,
    payload,
  );
  return response.data;
}


export async function getMaterialRequestDocuments(
  id: string,
  params?: { page?: number; page_size?: number },
): Promise<PaginatedDocumentsResponse> {
  const response = await apiClient.get<PaginatedDocumentsResponse>(
    `/content-requests/${id}/documents`,
    { params },
  );
  return response.data;
}


export async function getContentRequestContentWorkspaces(
  id: string,
): Promise<ContentWorkspaceSummary[]> {
  const response = await apiClient.get<ContentWorkspaceSummary[]>(
    `/content-requests/${id}/content-workspaces`,
  );
  return response.data;
}


export async function startRegionalEvaluation(id: string, notes?: string | null): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional/start`,
    { notes: notes ?? null },
  );
  return response.data;
}


export async function getContentRequestRegionalRoutingPreview(id: string): Promise<{
  derived_region: { id: number | null; name: string | null; code: string | null; reason: string; warnings: string[] };
  therapy_lead: {
    assignment_found: boolean;
    assignment_type: string | null;
    assigned_user_id: number | null;
    assigned_group_id: number | null;
    assignment_rule_id: number | null;
    reason: string;
    warnings: string[];
  };
}> {
  const response = await apiClient.get(`/content-requests/${id}/regional/routing-preview`);
  return response.data;
}


export async function approveRouteRegionalRequest(id: string, notes?: string | null): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional/approve-route`,
    { notes: notes ?? null },
  );
  return response.data;
}


export async function startTherapyDraftCreation(id: string): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/therapy/start-draft`,
  );
  return response.data;
}


export async function createContentWorkspace(id: string): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/therapy/create-content-workspace`,
  );
  return response.data;
}


export async function requestRegionalModification(
  id: string,
  payload: RegionalModificationPayload,
): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional/request-modification`,
    payload,
  );
  return response.data;
}


export async function rejectRegionalRequest(id: string, payload: RegionalReasonPayload): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional/reject`,
    payload,
  );
  return response.data;
}


export async function deferRegionalRequest(id: string, payload: RegionalDeferPayload): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional/defer`,
    payload,
  );
  return response.data;
}


export async function mergeRegionalRequest(id: string, payload: RegionalMergePayload): Promise<ContentRequestActionResponse> {
  const response = await apiClient.post<ContentRequestActionResponse>(
    `/content-requests/${id}/regional/merge`,
    payload,
  );
  return response.data;
}


export async function submitMaterialRequestMlr(
  id: string,
  documentId: number,
  payload: SubmitReviewPayload = {},
): Promise<SubmitReviewResponse> {
  const response = await apiClient.post<SubmitReviewResponse>(
    `/material-requests/${id}/submit-mlr`,
    {
      document_id: documentId,
      ...payload,
    },
  );
  return response.data;
}

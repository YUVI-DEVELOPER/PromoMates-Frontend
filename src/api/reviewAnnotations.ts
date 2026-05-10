import { apiClient } from "./client";
import type {
  DesignReviewAnnotationCreatePayload,
  ReviewAnnotation,
  ReviewAnnotationCreatePayload,
  ReviewAnnotationListParams,
  ReviewAnnotationListResponse,
  ReviewAnnotationResolvePayload,
  ReviewAnnotationUpdatePayload,
} from "../types/reviewAnnotation";


export async function getReviewAnnotations(
  params?: ReviewAnnotationListParams,
): Promise<ReviewAnnotationListResponse> {
  const response = await apiClient.get<ReviewAnnotationListResponse>(
    "/review-annotations",
    { params },
  );
  return response.data;
}


export async function getRequestReviewAnnotations(
  requestId: string,
  params?: Omit<ReviewAnnotationListParams, "request_id">,
): Promise<ReviewAnnotationListResponse> {
  const response = await apiClient.get<ReviewAnnotationListResponse>(
    `/material-requests/${requestId}/review-annotations`,
    { params },
  );
  return response.data;
}


export async function getDocumentReviewAnnotations(
  documentId: number,
  params?: Omit<ReviewAnnotationListParams, "document_id">,
): Promise<ReviewAnnotationListResponse> {
  const response = await apiClient.get<ReviewAnnotationListResponse>(
    `/documents/${documentId}/review-annotations`,
    { params },
  );
  return response.data;
}


export async function getTaskReviewAnnotations(
  taskId: number,
  params?: Omit<ReviewAnnotationListParams, "review_task_id">,
): Promise<ReviewAnnotationListResponse> {
  const response = await apiClient.get<ReviewAnnotationListResponse>(
    `/review-tasks/${taskId}/review-annotations`,
    { params },
  );
  return response.data;
}


export async function createReviewAnnotation(
  payload: ReviewAnnotationCreatePayload,
): Promise<ReviewAnnotation> {
  const response = await apiClient.post<ReviewAnnotation>("/review-annotations", payload);
  return response.data;
}


export async function updateReviewAnnotation(
  id: string,
  payload: ReviewAnnotationUpdatePayload,
): Promise<ReviewAnnotation> {
  const response = await apiClient.put<ReviewAnnotation>(`/review-annotations/${id}`, payload);
  return response.data;
}


export async function resolveReviewAnnotation(
  id: string,
  resolution_note?: string | null,
): Promise<ReviewAnnotation> {
  const payload: ReviewAnnotationResolvePayload = { resolution_note: resolution_note ?? null };
  const response = await apiClient.post<ReviewAnnotation>(
    `/review-annotations/${id}/resolve`,
    payload,
  );
  return response.data;
}


export async function reopenReviewAnnotation(id: string): Promise<ReviewAnnotation> {
  const response = await apiClient.post<ReviewAnnotation>(`/review-annotations/${id}/reopen`);
  return response.data;
}


export async function dismissReviewAnnotation(
  id: string,
  resolution_note?: string | null,
): Promise<ReviewAnnotation> {
  const payload: ReviewAnnotationResolvePayload = { resolution_note: resolution_note ?? null };
  const response = await apiClient.post<ReviewAnnotation>(
    `/review-annotations/${id}/dismiss`,
    payload,
  );
  return response.data;
}


export async function getDesignReviewAnnotations(
  requestId: string,
  params?: {
    design_draft_id?: string | null;
    status?: ReviewAnnotationListParams["status"];
    category?: string;
    page?: number;
    page_size?: number;
  },
  signal?: AbortSignal,
): Promise<ReviewAnnotationListResponse> {
  const response = await apiClient.get<ReviewAnnotationListResponse>(
    `/content-requests/${requestId}/design/review/annotations`,
    { params, signal },
  );
  return response.data;
}


export async function createDesignReviewAnnotation(
  requestId: string,
  payload: DesignReviewAnnotationCreatePayload,
): Promise<ReviewAnnotation> {
  const response = await apiClient.post<ReviewAnnotation>(
    `/content-requests/${requestId}/design/review/annotations`,
    payload,
  );
  return response.data;
}


export async function resolveDesignReviewAnnotation(
  requestId: string,
  annotationId: string,
): Promise<ReviewAnnotation> {
  const response = await apiClient.post<ReviewAnnotation>(
    `/content-requests/${requestId}/design/review/annotations/${annotationId}/resolve`,
  );
  return response.data;
}


export async function reopenDesignReviewAnnotation(
  requestId: string,
  annotationId: string,
): Promise<ReviewAnnotation> {
  const response = await apiClient.post<ReviewAnnotation>(
    `/content-requests/${requestId}/design/review/annotations/${annotationId}/reopen`,
  );
  return response.data;
}

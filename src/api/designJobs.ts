import { apiClient } from "./client";
import type {
  DesignJob,
  DesignAssigneeOptions,
  DesignJobCreatePayload,
  DesignContext,
  DesignDraftUploadPayload,
  DesignJobHistory,
  DesignJobStatus,
  DesignBriefActionResponse,
  DesignBriefPayload,
  DesignProductionActionResponse,
  DesignReviewActionResponse,
  DesignReviewApprovePayload,
  DesignReviewRevisionPayload,
  DesignRevisionUploadPayload,
  DesignTask,
  DesignReviewTask,
  DesignJobTransitionAction,
  DesignJobTransitionPayload,
  DesignJobUpdatePayload,
  DesignJobUploadPayload,
  SendToDesignPayload,
} from "../types/designJob";


export type DesignJobListParams = {
  request_id?: string;
  status?: DesignJobStatus;
  agency_id?: number;
  assigned_to_me?: boolean;
  created_by_me?: boolean;
};


export async function getDesignJobs(params?: DesignJobListParams): Promise<DesignJob[]> {
  const response = await apiClient.get<DesignJob[]>("/design-jobs", { params });
  return response.data;
}


export async function getDesignJob(id: string): Promise<DesignJob> {
  const response = await apiClient.get<DesignJob>(`/design-jobs/${id}`);
  return response.data;
}


export async function createDesignJob(payload: DesignJobCreatePayload): Promise<DesignJob> {
  const response = await apiClient.post<DesignJob>("/design-jobs", payload);
  return response.data;
}


export async function updateDesignJob(
  id: string,
  payload: DesignJobUpdatePayload,
): Promise<DesignJob> {
  const response = await apiClient.put<DesignJob>(`/design-jobs/${id}`, payload);
  return response.data;
}


export async function transitionDesignJob(
  id: string,
  action: DesignJobTransitionAction | string,
  comment?: string | null,
  contentVersionId?: string | null,
): Promise<DesignJob> {
  const payload: DesignJobTransitionPayload = {
    action,
    comment: comment ?? null,
    content_version_id: contentVersionId ?? null,
  };

  const response = await apiClient.post<DesignJob>(`/design-jobs/${id}/transition`, payload);
  return response.data;
}


export async function uploadDesignJobFile(
  id: string,
  file: File,
  metadata: DesignJobUploadPayload = {},
): Promise<DesignJob> {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.document_id) {
    formData.append("document_id", String(metadata.document_id));
  }
  if (metadata.asset_type) {
    formData.append("asset_type", metadata.asset_type);
  }
  if (metadata.version_label?.trim()) {
    formData.append("version_label", metadata.version_label.trim());
  }
  if (metadata.change_summary?.trim()) {
    formData.append("change_summary", metadata.change_summary.trim());
  }
  if (metadata.content_stage) {
    formData.append("content_stage", metadata.content_stage);
  }
  if (typeof metadata.is_primary === "boolean") {
    formData.append("is_primary", String(metadata.is_primary));
  }

  const response = await apiClient.post<DesignJob>(
    `/design-jobs/${id}/upload-design`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}


export async function getDesignJobHistory(id: string): Promise<DesignJobHistory[]> {
  const response = await apiClient.get<DesignJobHistory[]>(`/design-jobs/${id}/history`);
  return response.data;
}


export async function getRequestDesignJobs(requestId: string): Promise<DesignJob[]> {
  const response = await apiClient.get<DesignJob[]>(
    `/material-requests/${requestId}/design-jobs`,
  );
  return response.data;
}


export async function sendRequestToDesign(
  requestId: string,
  payload: SendToDesignPayload,
): Promise<DesignJob> {
  const response = await apiClient.post<DesignJob>(
    `/material-requests/${requestId}/send-to-design`,
    payload,
  );
  return response.data;
}


export async function getRequestDesignBrief(requestId: string): Promise<DesignJob | null> {
  const response = await apiClient.get<DesignJob | null>(
    `/content-requests/${requestId}/design-brief`,
  );
  return response.data;
}


export async function createDesignBrief(
  requestId: string,
  payload: DesignBriefPayload,
): Promise<DesignBriefActionResponse> {
  const response = await apiClient.post<DesignBriefActionResponse>(
    `/content-requests/${requestId}/design-brief`,
    payload,
  );
  return response.data;
}


export async function updateDesignBrief(
  requestId: string,
  briefId: string,
  payload: DesignBriefPayload,
): Promise<DesignBriefActionResponse> {
  const response = await apiClient.patch<DesignBriefActionResponse>(
    `/content-requests/${requestId}/design-brief/${briefId}`,
    payload,
  );
  return response.data;
}


export async function submitDesignBrief(
  requestId: string,
  briefId: string,
): Promise<DesignBriefActionResponse> {
  const response = await apiClient.post<DesignBriefActionResponse>(
    `/content-requests/${requestId}/design-brief/${briefId}/submit`,
  );
  return response.data;
}


export async function getDesignTasks(signal?: AbortSignal): Promise<DesignTask[]> {
  const response = await apiClient.get<DesignTask[]>("/content-requests/design/tasks", { signal, timeout: 15000 });
  return response.data;
}

export async function getDesignReviewTasks(signal?: AbortSignal): Promise<DesignReviewTask[]> {
  const response = await apiClient.get<DesignReviewTask[]>("/content-requests/design/review-tasks", { signal, timeout: 15000 });
  return response.data;
}


export async function getDesignContext(requestId: string, signal?: AbortSignal): Promise<DesignContext> {
  const response = await apiClient.get<DesignContext>(
    `/content-requests/${requestId}/design/context`,
    { signal, timeout: 15000 },
  );
  return response.data;
}


export async function getDesignAssignees(requestId: string): Promise<DesignAssigneeOptions> {
  const response = await apiClient.get<DesignAssigneeOptions>(
    `/content-requests/${requestId}/design/assignees`,
  );
  return response.data;
}


export async function startDesignWork(requestId: string): Promise<DesignProductionActionResponse> {
  const response = await apiClient.post<DesignProductionActionResponse>(
    `/content-requests/${requestId}/design/start`,
  );
  return response.data;
}


export async function uploadDesignDraft(
  requestId: string,
  file: File,
  metadata: DesignDraftUploadPayload = {},
): Promise<DesignProductionActionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.design_brief_id) {
    formData.append("design_brief_id", metadata.design_brief_id);
  }
  if (metadata.draft_label?.trim()) {
    formData.append("draft_label", metadata.draft_label.trim());
  }
  if (metadata.upload_notes?.trim()) {
    formData.append("upload_notes", metadata.upload_notes.trim());
  }
  if (metadata.change_summary?.trim()) {
    formData.append("change_summary", metadata.change_summary.trim());
  }

  const response = await apiClient.post<DesignProductionActionResponse>(
    `/content-requests/${requestId}/design/drafts/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}


export async function startDesignReview(requestId: string): Promise<DesignReviewActionResponse> {
  const response = await apiClient.post<DesignReviewActionResponse>(
    `/content-requests/${requestId}/design/review/start`,
  );
  return response.data;
}


export async function approveDesignDraft(
  requestId: string,
  payload: DesignReviewApprovePayload,
): Promise<DesignReviewActionResponse> {
  const response = await apiClient.post<DesignReviewActionResponse>(
    `/content-requests/${requestId}/design/review/approve`,
    payload,
  );
  return response.data;
}


export async function requestDesignRevision(
  requestId: string,
  payload: DesignReviewRevisionPayload,
): Promise<DesignReviewActionResponse> {
  const response = await apiClient.post<DesignReviewActionResponse>(
    `/content-requests/${requestId}/design/review/request-revision`,
    payload,
  );
  return response.data;
}


export async function startDesignRevision(requestId: string): Promise<DesignContext> {
  const response = await apiClient.post<DesignContext>(
    `/content-requests/${requestId}/design/revision/start`,
  );
  return response.data;
}


export async function uploadRevisedDesignDraft(
  requestId: string,
  file: File,
  metadata: DesignRevisionUploadPayload,
): Promise<DesignContext> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("change_summary", metadata.change_summary.trim());
  if (metadata.design_brief_id) {
    formData.append("design_brief_id", metadata.design_brief_id);
  }
  if (metadata.draft_label?.trim()) {
    formData.append("draft_label", metadata.draft_label.trim());
  }
  if (metadata.designer_notes?.trim()) {
    formData.append("designer_notes", metadata.designer_notes.trim());
  }
  for (const annotationId of metadata.addressed_annotation_ids ?? []) {
    formData.append("addressed_annotation_ids", annotationId);
  }
  for (const annotationId of metadata.unresolved_annotation_ids ?? []) {
    formData.append("unresolved_annotation_ids", annotationId);
  }
  if (metadata.annotation_responses && metadata.annotation_responses.length > 0) {
    formData.append("annotation_responses_json", JSON.stringify(metadata.annotation_responses));
  }

  const response = await apiClient.post<DesignContext>(
    `/content-requests/${requestId}/design/revision/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

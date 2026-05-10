import { apiClient } from "./client";
import type {
  ContentVersion,
  ContentWorkspaceDetail,
  DraftVersionCreatePayload,
  DraftVersionCreateResponse,
  ContentVersionCreatePayload,
  ContentVersionListParams,
  ContentVersionListResponse,
  ContentVersionUpdatePayload,
  ContentWorkspaceEditorDetail,
  DraftVersionFromEditorPayload,
  EditorAutosavePayload,
  EditorAutosaveResponse,
} from "../types/contentVersion";


export async function getContentVersions(
  params?: ContentVersionListParams,
): Promise<ContentVersionListResponse> {
  const response = await apiClient.get<ContentVersionListResponse>(
    "/content-versions",
    { params },
  );
  return response.data;
}


export async function getContentVersion(id: string): Promise<ContentVersion> {
  const response = await apiClient.get<ContentVersion>(`/content-versions/${id}`);
  return response.data;
}


export async function createContentVersion(
  payload: ContentVersionCreatePayload,
): Promise<ContentVersion> {
  const response = await apiClient.post<ContentVersion>("/content-versions", payload);
  return response.data;
}


export async function updateContentVersion(
  id: string,
  payload: ContentVersionUpdatePayload,
): Promise<ContentVersion> {
  const response = await apiClient.put<ContentVersion>(`/content-versions/${id}`, payload);
  return response.data;
}


export async function getRequestContentVersions(
  requestId: string,
  params?: Omit<ContentVersionListParams, "request_id">,
): Promise<ContentVersionListResponse> {
  const response = await apiClient.get<ContentVersionListResponse>(
    `/material-requests/${requestId}/content-versions`,
    { params },
  );
  return response.data;
}


export async function getDocumentContentVersions(
  documentId: number,
  params?: Omit<ContentVersionListParams, "document_id">,
): Promise<ContentVersionListResponse> {
  const response = await apiClient.get<ContentVersionListResponse>(
    `/documents/${documentId}/content-versions`,
    { params },
  );
  return response.data;
}


export async function getContentWorkspaceDetail(
  contentWorkspaceId: number,
): Promise<ContentWorkspaceDetail> {
  const response = await apiClient.get<ContentWorkspaceDetail>(
    `/content-workspaces/${contentWorkspaceId}`,
  );
  return response.data;
}


export async function getContentWorkspaceEditor(
  contentWorkspaceId: number,
): Promise<ContentWorkspaceEditorDetail> {
  const response = await apiClient.get<ContentWorkspaceEditorDetail>(
    `/content-workspaces/${contentWorkspaceId}/editor`,
  );
  return response.data;
}


export async function autosaveContentWorkspaceEditor(
  contentWorkspaceId: number,
  payload: EditorAutosavePayload,
): Promise<EditorAutosaveResponse> {
  const response = await apiClient.post<EditorAutosaveResponse>(
    `/content-workspaces/${contentWorkspaceId}/editor/autosave`,
    payload,
  );
  return response.data;
}


export async function getContentWorkspaceDraftVersions(
  contentWorkspaceId: number,
): Promise<ContentVersion[]> {
  const response = await apiClient.get<ContentVersion[]>(
    `/content-workspaces/${contentWorkspaceId}/draft-versions`,
  );
  return response.data;
}


export async function getCurrentContentWorkspaceDraftVersion(
  contentWorkspaceId: number,
): Promise<ContentVersion | null> {
  const response = await apiClient.get<ContentVersion | null>(
    `/content-workspaces/${contentWorkspaceId}/draft-versions/current`,
  );
  return response.data;
}


export async function createContentWorkspaceDraftVersionFromEditor(
  contentWorkspaceId: number,
  payload: DraftVersionFromEditorPayload,
): Promise<DraftVersionCreateResponse> {
  const response = await apiClient.post<DraftVersionCreateResponse>(
    `/content-workspaces/${contentWorkspaceId}/draft-versions/from-editor`,
    payload,
  );
  return response.data;
}


export async function createContentWorkspaceDraftVersion(
  contentWorkspaceId: number,
  payload: DraftVersionCreatePayload,
): Promise<DraftVersionCreateResponse> {
  const formData = new FormData();
  if (payload.version_label?.trim()) {
    formData.append("version_label", payload.version_label.trim());
  }
  if (payload.draft_notes?.trim()) {
    formData.append("draft_notes", payload.draft_notes.trim());
  }
  formData.append("change_summary", payload.change_summary.trim());
  if (payload.file_asset_id) {
    formData.append("file_asset_id", String(payload.file_asset_id));
  }
  if (payload.draft_file) {
    formData.append("draft_file", payload.draft_file);
  }

  const response = await apiClient.post<DraftVersionCreateResponse>(
    `/content-workspaces/${contentWorkspaceId}/draft-versions`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

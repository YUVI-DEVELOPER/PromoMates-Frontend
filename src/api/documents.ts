import { apiClient } from "./client";
import type {
  DocumentCreatePayload,
  DocumentDetail,
  DocumentListParams,
  DocumentStateHistory,
  DocumentStatusUpdatePayload,
  DocumentUpdatePayload,
  DocumentVersion,
  PaginatedDocumentsResponse,
} from "../types/document";


export async function getDocuments(
  params?: DocumentListParams,
): Promise<PaginatedDocumentsResponse> {
  const response = await apiClient.get<PaginatedDocumentsResponse>("/documents", { params });
  return response.data;
}


export async function createDocument(
  payload: DocumentCreatePayload,
): Promise<DocumentDetail> {
  const response = await apiClient.post<DocumentDetail>("/documents", payload);
  return response.data;
}


export async function getDocument(documentId: number): Promise<DocumentDetail> {
  const response = await apiClient.get<DocumentDetail>(`/documents/${documentId}`);
  return response.data;
}


export async function updateDocument(
  documentId: number,
  payload: DocumentUpdatePayload,
): Promise<DocumentDetail> {
  const response = await apiClient.patch<DocumentDetail>(`/documents/${documentId}`, payload);
  return response.data;
}


export async function withdrawDocument(documentId: number): Promise<DocumentDetail> {
  const response = await apiClient.delete<DocumentDetail>(`/documents/${documentId}`);
  return response.data;
}


export async function getDocumentVersions(
  documentId: number,
): Promise<DocumentVersion[]> {
  const response = await apiClient.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
  return response.data;
}


export async function getDocumentHistory(
  documentId: number,
): Promise<DocumentStateHistory[]> {
  const response = await apiClient.get<DocumentStateHistory[]>(`/documents/${documentId}/history`);
  return response.data;
}


export async function updateDocumentStatus(
  documentId: number,
  payload: DocumentStatusUpdatePayload,
): Promise<DocumentDetail> {
  const response = await apiClient.post<DocumentDetail>(`/documents/${documentId}/status`, payload);
  return response.data;
}

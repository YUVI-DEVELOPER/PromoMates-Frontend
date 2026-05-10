import { apiClient } from "./client";
import type {
  CollaborationStageCode,
  ContentCollaborationComment,
  ContentCollaborationCommentCreatePayload,
  TherapyAlignmentCompletePayload,
  TherapyAlignmentCompleteResponse,
} from "../types/collaborationComment";


export async function listContentRequestComments(
  requestId: string,
  stageCode: CollaborationStageCode = "THERAPY_ALIGNMENT",
): Promise<ContentCollaborationComment[]> {
  const response = await apiClient.get<ContentCollaborationComment[]>(
    `/content-requests/${requestId}/collaboration-comments`,
    { params: { stage_code: stageCode } },
  );
  return response.data;
}


export async function createContentRequestComment(
  requestId: string,
  payload: ContentCollaborationCommentCreatePayload,
): Promise<ContentCollaborationComment> {
  const response = await apiClient.post<ContentCollaborationComment>(
    `/content-requests/${requestId}/collaboration-comments`,
    payload,
  );
  return response.data;
}


export async function resolveContentRequestComment(
  requestId: string,
  commentId: string,
): Promise<ContentCollaborationComment> {
  const response = await apiClient.post<ContentCollaborationComment>(
    `/content-requests/${requestId}/collaboration-comments/${commentId}/resolve`,
  );
  return response.data;
}


export async function reopenContentRequestComment(
  requestId: string,
  commentId: string,
): Promise<ContentCollaborationComment> {
  const response = await apiClient.post<ContentCollaborationComment>(
    `/content-requests/${requestId}/collaboration-comments/${commentId}/reopen`,
  );
  return response.data;
}


export async function completeTherapyAlignment(
  requestId: string,
  payload: TherapyAlignmentCompletePayload,
): Promise<TherapyAlignmentCompleteResponse> {
  const response = await apiClient.post<TherapyAlignmentCompleteResponse>(
    `/content-requests/${requestId}/therapy/complete-alignment`,
    payload,
  );
  return response.data;
}

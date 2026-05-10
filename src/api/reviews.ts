import { apiClient } from "./client";
import type {
  PaginatedReviewsResponse,
  PaginatedTasksResponse,
  Review,
  ReviewListParams,
  ReviewTask,
  SubmitReviewPayload,
  SubmitReviewResponse,
  TaskAssignPayload,
  TaskDecisionPayload,
  TaskListParams,
} from "../types/review";


export async function submitDocumentReview(
  documentId: number,
  payload: SubmitReviewPayload,
): Promise<SubmitReviewResponse> {
  const response = await apiClient.post<SubmitReviewResponse>(
    `/documents/${documentId}/submit-review`,
    payload,
  );
  return response.data;
}


export async function getReviews(
  params?: ReviewListParams,
): Promise<PaginatedReviewsResponse> {
  const response = await apiClient.get<PaginatedReviewsResponse>("/reviews", { params });
  return response.data;
}


export async function getReview(reviewId: number): Promise<Review> {
  const response = await apiClient.get<Review>(`/reviews/${reviewId}`);
  return response.data;
}


export async function getDocumentReviews(
  documentId: number,
): Promise<PaginatedReviewsResponse> {
  const response = await apiClient.get<PaginatedReviewsResponse>(
    `/documents/${documentId}/reviews`,
  );
  return response.data;
}


export async function getTasks(
  params?: TaskListParams,
): Promise<PaginatedTasksResponse> {
  const response = await apiClient.get<PaginatedTasksResponse>("/tasks", { params });
  return response.data;
}


export async function getTask(taskId: number): Promise<ReviewTask> {
  const response = await apiClient.get<ReviewTask>(`/tasks/${taskId}`);
  return response.data;
}


export async function assignTask(
  taskId: number,
  payload: TaskAssignPayload,
): Promise<ReviewTask> {
  const response = await apiClient.post<ReviewTask>(`/tasks/${taskId}/assign`, payload);
  return response.data;
}


export async function startTask(taskId: number): Promise<ReviewTask> {
  const response = await apiClient.post<ReviewTask>(`/tasks/${taskId}/start`);
  return response.data;
}


export async function decideTask(
  taskId: number,
  payload: TaskDecisionPayload,
): Promise<ReviewTask> {
  const response = await apiClient.post<ReviewTask>(`/tasks/${taskId}/decision`, payload);
  return response.data;
}

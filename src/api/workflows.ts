import { apiClient } from "./client";
import type {
  Workflow,
  WorkflowCreatePayload,
  WorkflowListParams,
  WorkflowStage,
  WorkflowStageCreatePayload,
  WorkflowStageUpdatePayload,
  WorkflowUpdatePayload,
} from "../types/workflow";


export async function getWorkflows(params?: WorkflowListParams): Promise<Workflow[]> {
  const response = await apiClient.get<Workflow[]>("/workflows", { params });
  return response.data;
}


export async function getDefaultWorkflow(): Promise<Workflow> {
  const response = await apiClient.get<Workflow>("/workflows/default");
  return response.data;
}


export async function getWorkflow(workflowId: number): Promise<Workflow> {
  const response = await apiClient.get<Workflow>(`/workflows/${workflowId}`);
  return response.data;
}


export async function createWorkflow(payload: WorkflowCreatePayload): Promise<Workflow> {
  const response = await apiClient.post<Workflow>("/workflows", payload);
  return response.data;
}


export async function updateWorkflow(
  workflowId: number,
  payload: WorkflowUpdatePayload,
): Promise<Workflow> {
  const response = await apiClient.patch<Workflow>(`/workflows/${workflowId}`, payload);
  return response.data;
}


export async function deactivateWorkflow(workflowId: number): Promise<Workflow> {
  const response = await apiClient.delete<Workflow>(`/workflows/${workflowId}`);
  return response.data;
}


export async function addWorkflowStage(
  workflowId: number,
  payload: WorkflowStageCreatePayload,
): Promise<WorkflowStage> {
  const response = await apiClient.post<WorkflowStage>(
    `/workflows/${workflowId}/stages`,
    payload,
  );
  return response.data;
}


export async function updateWorkflowStage(
  workflowId: number,
  stageId: number,
  payload: WorkflowStageUpdatePayload,
): Promise<WorkflowStage> {
  const response = await apiClient.patch<WorkflowStage>(
    `/workflows/${workflowId}/stages/${stageId}`,
    payload,
  );
  return response.data;
}


export async function deleteWorkflowStage(
  workflowId: number,
  stageId: number,
): Promise<void> {
  await apiClient.delete(`/workflows/${workflowId}/stages/${stageId}`);
}

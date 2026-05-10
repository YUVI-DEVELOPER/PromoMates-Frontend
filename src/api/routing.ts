import { apiClient } from "./client";
import type {
  DesignerAssignment,
  DesignerAssignmentPayload,
  MedicalReviewerAssignment,
  MedicalReviewerAssignmentPayload,
  MLRReviewerAssignment,
  MLRReviewerAssignmentPayload,
  RegionalMarketingAssignment,
  RegionalMarketingAssignmentPayload,
  RoutingPreview,
  TherapyLeadAssignment,
  TherapyLeadAssignmentPayload,
} from "../types/routing";


type ListParams = {
  include_inactive?: boolean;
};


export type RoutingPreviewParams = {
  country_id: number;
  therapy_area_id: number;
  sub_therapy_area_id?: number;
  content_type_id?: number;
};


async function getList<T>(url: string, params?: ListParams): Promise<T[]> {
  const response = await apiClient.get<T[]>(url, { params });
  return response.data;
}


async function createItem<T, Payload>(url: string, payload: Payload): Promise<T> {
  const response = await apiClient.post<T>(url, payload);
  return response.data;
}


async function updateItem<T, Payload>(
  url: string,
  id: number,
  payload: Partial<Payload>,
): Promise<T> {
  const response = await apiClient.patch<T>(`${url}/${id}`, payload);
  return response.data;
}


async function deactivateItem<T>(url: string, id: number): Promise<T> {
  const response = await apiClient.patch<T>(`${url}/${id}/deactivate`);
  return response.data;
}


export async function getRoutingPreview(params: RoutingPreviewParams): Promise<RoutingPreview> {
  const response = await apiClient.get<RoutingPreview>("/routing/preview", { params });
  return response.data;
}


export const regionalMarketingAssignmentsApi = {
  list: (params?: ListParams) =>
    getList<RegionalMarketingAssignment>("/routing/regional-marketing-assignments", params),
  create: (payload: RegionalMarketingAssignmentPayload) =>
    createItem<RegionalMarketingAssignment, RegionalMarketingAssignmentPayload>(
      "/routing/regional-marketing-assignments",
      payload,
    ),
  update: (id: number, payload: Partial<RegionalMarketingAssignmentPayload>) =>
    updateItem<RegionalMarketingAssignment, RegionalMarketingAssignmentPayload>(
      "/routing/regional-marketing-assignments",
      id,
      payload,
    ),
  deactivate: (id: number) =>
    deactivateItem<RegionalMarketingAssignment>("/routing/regional-marketing-assignments", id),
};


export const therapyLeadAssignmentsApi = {
  list: (params?: ListParams) =>
    getList<TherapyLeadAssignment>("/routing/therapy-lead-assignments", params),
  create: (payload: TherapyLeadAssignmentPayload) =>
    createItem<TherapyLeadAssignment, TherapyLeadAssignmentPayload>(
      "/routing/therapy-lead-assignments",
      payload,
    ),
  update: (id: number, payload: Partial<TherapyLeadAssignmentPayload>) =>
    updateItem<TherapyLeadAssignment, TherapyLeadAssignmentPayload>(
      "/routing/therapy-lead-assignments",
      id,
      payload,
    ),
  deactivate: (id: number) =>
    deactivateItem<TherapyLeadAssignment>("/routing/therapy-lead-assignments", id),
};


export const medicalReviewerAssignmentsApi = {
  list: (params?: ListParams) =>
    getList<MedicalReviewerAssignment>("/routing/medical-reviewer-assignments", params),
  create: (payload: MedicalReviewerAssignmentPayload) =>
    createItem<MedicalReviewerAssignment, MedicalReviewerAssignmentPayload>(
      "/routing/medical-reviewer-assignments",
      payload,
    ),
  update: (id: number, payload: Partial<MedicalReviewerAssignmentPayload>) =>
    updateItem<MedicalReviewerAssignment, MedicalReviewerAssignmentPayload>(
      "/routing/medical-reviewer-assignments",
      id,
      payload,
    ),
  deactivate: (id: number) =>
    deactivateItem<MedicalReviewerAssignment>("/routing/medical-reviewer-assignments", id),
};


export const designerAssignmentsApi = {
  list: (params?: ListParams) =>
    getList<DesignerAssignment>("/routing/designer-assignments", params),
  create: (payload: DesignerAssignmentPayload) =>
    createItem<DesignerAssignment, DesignerAssignmentPayload>(
      "/routing/designer-assignments",
      payload,
    ),
  update: (id: number, payload: Partial<DesignerAssignmentPayload>) =>
    updateItem<DesignerAssignment, DesignerAssignmentPayload>(
      "/routing/designer-assignments",
      id,
      payload,
    ),
  deactivate: (id: number) =>
    deactivateItem<DesignerAssignment>("/routing/designer-assignments", id),
};


export const mlrReviewerAssignmentsApi = {
  list: (params?: ListParams) =>
    getList<MLRReviewerAssignment>("/routing/mlr-reviewer-assignments", params),
  create: (payload: MLRReviewerAssignmentPayload) =>
    createItem<MLRReviewerAssignment, MLRReviewerAssignmentPayload>(
      "/routing/mlr-reviewer-assignments",
      payload,
    ),
  update: (id: number, payload: Partial<MLRReviewerAssignmentPayload>) =>
    updateItem<MLRReviewerAssignment, MLRReviewerAssignmentPayload>(
      "/routing/mlr-reviewer-assignments",
      id,
      payload,
    ),
  deactivate: (id: number) =>
    deactivateItem<MLRReviewerAssignment>("/routing/mlr-reviewer-assignments", id),
};

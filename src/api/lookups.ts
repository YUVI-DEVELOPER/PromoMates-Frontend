import { apiClient } from "./client";
import type {
  LookupCategory,
  LookupCategoryPayload,
  LookupListParams,
  LookupValue,
  LookupValuePayload,
  SystemOptions,
} from "../types/lookup";


export async function getLookupCategories(
  params?: Pick<LookupListParams, "include_inactive" | "sort_order_direction" | "sort_order_parity">,
): Promise<LookupCategory[]> {
  const response = await apiClient.get<LookupCategory[]>("/lookups/categories", { params });
  return response.data;
}


export async function createLookupCategory(
  payload: LookupCategoryPayload,
): Promise<LookupCategory> {
  const response = await apiClient.post<LookupCategory>("/lookups/categories", payload);
  return response.data;
}


export async function updateLookupCategory(
  id: number,
  payload: Partial<LookupCategoryPayload>,
): Promise<LookupCategory> {
  const response = await apiClient.patch<LookupCategory>(`/lookups/categories/${id}`, payload);
  return response.data;
}


export async function deleteLookupCategory(id: number): Promise<LookupCategory> {
  const response = await apiClient.delete<LookupCategory>(`/lookups/categories/${id}`);
  return response.data;
}


export async function getLookupValues(params?: LookupListParams): Promise<LookupValue[]> {
  const response = await apiClient.get<LookupValue[]>("/lookups/values", { params });
  return response.data;
}


export async function getLookupValuesByCategory(
  categoryCode: string,
  params?: Pick<LookupListParams, "include_inactive" | "sort_order_direction" | "sort_order_parity">,
): Promise<LookupValue[]> {
  const response = await apiClient.get<LookupValue[]>(
    `/lookups/${categoryCode}/values`,
    { params },
  );
  return response.data;
}


export async function createLookupValue(payload: LookupValuePayload): Promise<LookupValue> {
  const response = await apiClient.post<LookupValue>("/lookups/values", payload);
  return response.data;
}


export async function updateLookupValue(
  id: number,
  payload: Partial<LookupValuePayload>,
): Promise<LookupValue> {
  const response = await apiClient.patch<LookupValue>(`/lookups/values/${id}`, payload);
  return response.data;
}


export async function deleteLookupValue(id: number): Promise<LookupValue> {
  const response = await apiClient.delete<LookupValue>(`/lookups/values/${id}`);
  return response.data;
}


export async function getLookupSystemOptions(): Promise<SystemOptions> {
  const response = await apiClient.get<SystemOptions>("/lookups/system-options");
  return response.data;
}

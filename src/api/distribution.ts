import { apiClient } from "./client";
import type {
  DistributionPackage,
  DistributionPackageCreatePayload,
  DistributionPackageHistory,
  DistributionPackageListParams,
  DistributionPackageListResponse,
  DistributionPackageTransitionPayload,
  DistributionPackageUpdatePayload,
  PackageMaterial,
  PackageMaterialCreatePayload,
  PackageMaterialUpdatePayload,
  RecordSalesAccessPayload,
  SalesRepAccess,
  SalesRepAccessListParams,
} from "../types/distribution";
import type { UserGroupOption } from "../types/userGroup";


export async function getDistributionPackages(
  params?: DistributionPackageListParams,
): Promise<DistributionPackageListResponse> {
  const response = await apiClient.get<DistributionPackageListResponse>(
    "/distribution-packages",
    { params },
  );
  return response.data;
}


export async function getDistributionPackage(id: string): Promise<DistributionPackage> {
  const response = await apiClient.get<DistributionPackage>(`/distribution-packages/${id}`);
  return response.data;
}


export async function createDistributionPackage(
  payload: DistributionPackageCreatePayload,
): Promise<DistributionPackage> {
  const response = await apiClient.post<DistributionPackage>("/distribution-packages", payload);
  return response.data;
}


export async function updateDistributionPackage(
  id: string,
  payload: DistributionPackageUpdatePayload,
): Promise<DistributionPackage> {
  const response = await apiClient.put<DistributionPackage>(`/distribution-packages/${id}`, payload);
  return response.data;
}


export async function releaseDistributionPackage(
  id: string,
  payload: DistributionPackageTransitionPayload = {},
): Promise<DistributionPackage> {
  const response = await apiClient.post<DistributionPackage>(
    `/distribution-packages/${id}/release`,
    payload,
  );
  return response.data;
}


export async function withdrawDistributionPackage(
  id: string,
  reason: string,
): Promise<DistributionPackage> {
  const response = await apiClient.post<DistributionPackage>(
    `/distribution-packages/${id}/withdraw`,
    { reason },
  );
  return response.data;
}


export async function getDistributionPackageHistory(
  id: string,
): Promise<DistributionPackageHistory[]> {
  const response = await apiClient.get<DistributionPackageHistory[]>(
    `/distribution-packages/${id}/history`,
  );
  return response.data;
}


export async function getDistributionPackageGroups(
  id: string,
): Promise<UserGroupOption[]> {
  const response = await apiClient.get<UserGroupOption[]>(`/distribution-packages/${id}/groups`);
  return response.data;
}


export async function addGroupToPackage(
  id: string,
  groupId: number,
): Promise<UserGroupOption[]> {
  const response = await apiClient.post<UserGroupOption[]>(`/distribution-packages/${id}/groups`, {
    group_id: groupId,
  });
  return response.data;
}


export async function removeGroupFromPackage(id: string, groupId: number): Promise<void> {
  await apiClient.delete(`/distribution-packages/${id}/groups/${groupId}`);
}


export async function getPackageMaterials(packageId: string): Promise<PackageMaterial[]> {
  const response = await apiClient.get<PackageMaterial[]>(
    `/distribution-packages/${packageId}/materials`,
  );
  return response.data;
}


export async function addMaterialToPackage(
  packageId: string,
  payload: PackageMaterialCreatePayload,
): Promise<PackageMaterial> {
  const response = await apiClient.post<PackageMaterial>(
    `/distribution-packages/${packageId}/materials`,
    payload,
  );
  return response.data;
}


export async function updatePackageMaterial(
  packageId: string,
  materialId: string,
  payload: PackageMaterialUpdatePayload,
): Promise<PackageMaterial> {
  const response = await apiClient.put<PackageMaterial>(
    `/distribution-packages/${packageId}/materials/${materialId}`,
    payload,
  );
  return response.data;
}


export async function removeMaterialFromPackage(
  packageId: string,
  materialId: string,
): Promise<void> {
  await apiClient.delete(`/distribution-packages/${packageId}/materials/${materialId}`);
}


export async function getSalesRepMaterials(): Promise<PackageMaterial[]> {
  const response = await apiClient.get<PackageMaterial[]>("/sales-rep/materials");
  return response.data;
}


export async function recordSalesRepAccess(
  materialId: string,
  payload: RecordSalesAccessPayload,
): Promise<SalesRepAccess> {
  const response = await apiClient.post<SalesRepAccess>(
    `/sales-rep/materials/${materialId}/access`,
    payload,
  );
  return response.data;
}


export async function getSalesRepAccess(
  params?: SalesRepAccessListParams,
): Promise<SalesRepAccess[]> {
  const response = await apiClient.get<SalesRepAccess[]>("/sales-rep-access", { params });
  return response.data;
}


export async function getApprovedMaterialPackages(
  materialId: string,
): Promise<DistributionPackage[]> {
  const response = await apiClient.get<DistributionPackage[]>(
    `/approved-materials/${materialId}/packages`,
  );
  return response.data;
}

import { apiClient } from "./client";
import type { Permission, Role } from "../types/user";


export type RoleWritePayload = {
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
  is_active?: boolean;
};


export async function getRoles(includeInactive = false): Promise<Role[]> {
  const response = await apiClient.get<Role[]>("/roles", {
    params: { include_inactive: includeInactive },
  });
  return response.data;
}


export async function getRoleOptions(): Promise<Role[]> {
  const response = await apiClient.get<Role[]>("/roles/options");
  return response.data;
}


export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClient.get<Permission[]>("/permissions");
  return response.data;
}


export async function createRole(payload: RoleWritePayload): Promise<Role> {
  const response = await apiClient.post<Role>("/roles", payload);
  return response.data;
}


export async function updateRole(roleId: number, payload: Partial<RoleWritePayload>): Promise<Role> {
  const response = await apiClient.patch<Role>(`/roles/${roleId}`, payload);
  return response.data;
}


export async function deactivateRole(roleId: number): Promise<Role> {
  const response = await apiClient.patch<Role>(`/roles/${roleId}/deactivate`);
  return response.data;
}

import { apiClient } from "./client";
import type {
  UserGroup,
  UserGroupListParams,
  UserGroupMember,
  UserGroupMemberAddPayload,
  UserGroupOption,
  UserGroupPayload,
} from "../types/userGroup";


export async function getUserGroups(params?: UserGroupListParams): Promise<UserGroup[]> {
  const response = await apiClient.get<UserGroup[]>("/user-groups", { params });
  return response.data;
}


export async function getUserGroupOptions(): Promise<UserGroupOption[]> {
  const response = await apiClient.get<UserGroupOption[]>("/user-groups/options");
  return response.data;
}


export async function createUserGroup(payload: UserGroupPayload): Promise<UserGroup> {
  const response = await apiClient.post<UserGroup>("/user-groups", payload);
  return response.data;
}


export async function updateUserGroup(
  groupId: number,
  payload: Partial<UserGroupPayload>,
): Promise<UserGroup> {
  const response = await apiClient.patch<UserGroup>(`/user-groups/${groupId}`, payload);
  return response.data;
}


export async function deactivateUserGroup(groupId: number): Promise<UserGroup> {
  const response = await apiClient.patch<UserGroup>(`/user-groups/${groupId}/deactivate`);
  return response.data;
}


export async function getUserGroupMembers(groupId: number): Promise<UserGroupMember[]> {
  const response = await apiClient.get<UserGroupMember[]>(`/user-groups/${groupId}/members`);
  return response.data;
}


export async function addUserToGroup(
  groupId: number,
  payload: UserGroupMemberAddPayload,
): Promise<UserGroupMember> {
  const response = await apiClient.post<UserGroupMember>(`/user-groups/${groupId}/members`, payload);
  return response.data;
}


export async function removeUserFromGroup(groupId: number, userId: number): Promise<void> {
  await apiClient.delete(`/user-groups/${groupId}/members/${userId}`);
}


export async function getGroupsForUser(userId: number): Promise<UserGroupOption[]> {
  const response = await apiClient.get<UserGroupOption[]>(`/users/${userId}/groups`);
  return response.data;
}

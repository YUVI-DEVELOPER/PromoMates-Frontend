import { apiClient } from "./client";
import type { Role, User, UserCreatePayload, UserUpdatePayload } from "../types/user";


export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>("/users");
  return response.data;
}


export async function getUserById(userId: number): Promise<User> {
  const response = await apiClient.get<User>(`/users/${userId}`);
  return response.data;
}


export async function createUser(payload: UserCreatePayload): Promise<User> {
  const response = await apiClient.post<User>("/users", payload);
  return response.data;
}


export async function updateUser(
  userId: number,
  payload: UserUpdatePayload,
): Promise<User> {
  const response = await apiClient.patch<User>(`/users/${userId}`, payload);
  return response.data;
}


export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}


export async function getRoles(): Promise<Role[]> {
  const response = await apiClient.get<Role[]>("/roles");
  return response.data;
}

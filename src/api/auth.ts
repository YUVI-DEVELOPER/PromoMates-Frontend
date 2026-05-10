import { apiClient } from "./client";
import type { CurrentUserResponse, LoginResponse } from "../types/auth";


export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  return response.data;
}


export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>("/auth/me");
  return response.data;
}

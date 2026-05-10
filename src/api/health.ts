import { apiClient } from "./client";


export type HealthResponse = {
  status: string;
  service: string;
};


export async function getHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>("/health");
  return response.data;
}

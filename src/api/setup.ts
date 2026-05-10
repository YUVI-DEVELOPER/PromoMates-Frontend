import { apiClient } from "./client";
import type { SetupChecklistItem } from "../types/setup";


export async function getSetupChecklist(): Promise<SetupChecklistItem[]> {
  const response = await apiClient.get<SetupChecklistItem[]>("/setup/checklist");
  return response.data;
}

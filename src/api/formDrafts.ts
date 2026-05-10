import { apiClient } from "./client";
import { getStoredAuthToken } from "../utils/authStorage";


export type FormDraft<TPayload> = {
  form_key: string;
  payload: TPayload;
  updated_at: string;
  expires_at: string | null;
  ttl_seconds: number | null;
};


function formDraftPath(formKey: string): string {
  return `/form-drafts/${encodeURIComponent(formKey)}`;
}


export async function getFormDraft<TPayload>(formKey: string): Promise<FormDraft<TPayload> | null> {
  const response = await apiClient.get<FormDraft<TPayload> | null>(formDraftPath(formKey));
  return response.data;
}


export async function saveFormDraft<TPayload extends object>(
  formKey: string,
  payload: TPayload,
): Promise<FormDraft<TPayload>> {
  const response = await apiClient.put<FormDraft<TPayload>>(formDraftPath(formKey), { payload });
  return response.data;
}


export async function deleteFormDraft(formKey: string): Promise<void> {
  await apiClient.delete(formDraftPath(formKey));
}


export function flushFormDraft<TPayload extends object>(
  formKey: string,
  payload: TPayload,
): void {
  const token = getStoredAuthToken();
  const baseUrl = apiClient.defaults.baseURL ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  void fetch(`${baseUrl}${formDraftPath(formKey)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ payload }),
    keepalive: true,
  });
}

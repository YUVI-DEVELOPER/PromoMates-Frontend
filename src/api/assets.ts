import { apiClient } from "./client";
import type {
  Asset,
  AssetPreview,
  AssetPreviewPage,
  AssetUploadMetadata,
  AssetUploadResponse,
} from "../types/asset";


export async function uploadDocumentAsset(
  documentId: number,
  file: File,
  metadata: AssetUploadMetadata = {},
): Promise<AssetUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.asset_type) {
    formData.append("asset_type", metadata.asset_type);
  }
  if (typeof metadata.is_primary === "boolean") {
    formData.append("is_primary", String(metadata.is_primary));
  }
  if (metadata.request_id) {
    formData.append("request_id", metadata.request_id);
  }
  if (metadata.version_label?.trim()) {
    formData.append("version_label", metadata.version_label.trim());
  }
  if (metadata.content_stage) {
    formData.append("content_stage", metadata.content_stage);
  }
  if (metadata.change_summary?.trim()) {
    formData.append("change_summary", metadata.change_summary.trim());
  }
  if (typeof metadata.create_content_version_metadata === "boolean") {
    formData.append("create_content_version_metadata", String(metadata.create_content_version_metadata));
  }

  const response = await apiClient.post<AssetUploadResponse>(
    `/documents/${documentId}/assets/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}


export async function getDocumentAssets(documentId: number): Promise<Asset[]> {
  const response = await apiClient.get<Asset[]>(`/documents/${documentId}/assets`);
  return response.data;
}


export async function getPrimaryAsset(documentId: number): Promise<Asset> {
  const response = await apiClient.get<Asset>(`/documents/${documentId}/assets/primary`);
  return response.data;
}


export async function downloadAsset(
  assetId: number,
  originalFilename: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(`/assets/${assetId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = originalFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}


export async function openAssetInNewTab(assetId: number): Promise<void> {
  const response = await apiClient.get<Blob>(`/assets/${assetId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}


export async function deleteAsset(assetId: number): Promise<Asset> {
  const response = await apiClient.delete<Asset>(`/assets/${assetId}`);
  return response.data;
}


export async function getAssetPreviewMeta(assetId: number): Promise<AssetPreview> {
  const response = await apiClient.get<AssetPreview>(`/assets/${assetId}/preview-meta`);
  return response.data;
}


export async function generateAssetPreview(assetId: number): Promise<AssetPreview> {
  const response = await apiClient.post<AssetPreview>(`/assets/${assetId}/generate-preview`);
  return response.data;
}


export async function getAssetPreviewPages(assetId: number): Promise<AssetPreviewPage[]> {
  const response = await apiClient.get<AssetPreviewPage[]>(`/assets/${assetId}/preview-pages`);
  return response.data;
}


export async function getAssetViewerSourceBlob(assetId: number): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/assets/${assetId}/viewer-source`, {
    responseType: "blob",
  });
  return response.data;
}


export async function getAssetViewerSourceArrayBuffer(assetId: number): Promise<ArrayBuffer> {
  const response = await apiClient.get<ArrayBuffer>(`/assets/${assetId}/viewer-source`, {
    responseType: "arraybuffer",
  });
  return response.data;
}

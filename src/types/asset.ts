import type { DocumentUser } from "./document";
import type { AssetType, ContentStage } from "./contentVersion";


export type Asset = {
  id: number;
  document_id: number;
  original_filename: string;
  stored_filename?: string;
  mime_type: string;
  file_size: number;
  checksum_sha256: string;
  version_number: number;
  asset_type: AssetType;
  is_primary: boolean;
  uploaded_by_id: number;
  created_at: string;
  is_deleted?: boolean;
  download_url?: string | null;
  uploaded_by?: DocumentUser | null;
};


export type AssetUploadResponse = Asset & {
  message?: string;
};


export type AssetUploadMetadata = {
  asset_type?: AssetType;
  is_primary?: boolean;
  request_id?: string | null;
  version_label?: string | null;
  content_stage?: ContentStage | null;
  change_summary?: string | null;
  create_content_version_metadata?: boolean;
};


export type AssetPreviewType = "PDF" | "IMAGE" | "VIDEO" | "AUDIO" | "HTML" | "UNSUPPORTED";


export type AssetPreviewStatus = "PENDING" | "READY" | "FAILED" | "UNSUPPORTED";


export type ViewerAsset = Pick<Asset, "id" | "original_filename" | "mime_type" | "file_size" | "download_url"> & {
  version_number?: number;
};


export type AssetPreview = {
  id: number | null;
  asset_id: number;
  preview_type: AssetPreviewType;
  preview_status: AssetPreviewStatus;
  source_mime_type: string | null;
  viewer_mime_type: string | null;
  page_count: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  conversion_error: string | null;
  preview_storage_path: string | null;
  thumbnail_storage_path: string | null;
  viewer_source_url: string | null;
  thumbnail_url: string | null;
  download_url: string | null;
  original_filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  generated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};


export type AssetPreviewPage = {
  page_number: number;
  source_url: string;
  thumbnail_url: string | null;
};

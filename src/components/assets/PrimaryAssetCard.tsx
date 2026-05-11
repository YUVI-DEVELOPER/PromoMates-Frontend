import type { Asset } from "../../types/asset";
import { assetTypeLabels } from "../../types/contentVersion";
import { formatFileSize } from "../../utils/fileSize";


type PrimaryAssetCardProps = {
  asset: Asset | null;
  onDownload: (asset: Asset) => void;
};


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function shortChecksum(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}...` : value;
}


function readableFileType(mimeType: string): string {
  const types: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "audio/aac": "AAC",
    "audio/mpeg": "MP3",
    "audio/mp4": "M4A",
    "audio/ogg": "OGG",
    "audio/wav": "WAV",
    "audio/webm": "WEBM Audio",
    "audio/x-m4a": "M4A",
    "audio/x-wav": "WAV",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "text/plain": "TXT",
    "video/mp4": "MP4",
    "video/ogg": "OGV",
    "video/quicktime": "MOV",
    "video/webm": "WEBM Video",
  };

  return types[mimeType] ?? mimeType;
}


export function PrimaryAssetCard({ asset, onDownload }: PrimaryAssetCardProps) {
  if (!asset) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Primary File</h3>
        <p className="mt-2 text-sm text-slate-600">
          No file uploaded yet. Upload a primary file before sending this document to review.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">Primary File</h3>
          <p className="mt-2 break-words text-base font-semibold text-slate-950">
            {asset.original_filename}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Version {asset.version_number} - {readableFileType(asset.mime_type)} -{" "}
            {formatFileSize(asset.file_size)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDownload(asset)}
          className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          Download
        </button>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailItem label="MIME Type" value={asset.mime_type} />
        <DetailItem label="Asset Type" value={assetTypeLabels[asset.asset_type]} />
        <DetailItem label="Uploaded" value={formatDateTime(asset.created_at)} />
        <DetailItem label="SHA256" value={shortChecksum(asset.checksum_sha256)} />
        <DetailItem
          label="Uploaded By"
          value={asset.uploaded_by?.full_name ?? `User ${asset.uploaded_by_id}`}
        />
      </dl>
    </section>
  );
}


type DetailItemProps = {
  label: string;
  value: string;
};


function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}

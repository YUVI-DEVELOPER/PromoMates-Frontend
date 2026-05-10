import type { Asset } from "../../types/asset";
import { assetTypeLabels } from "../../types/contentVersion";
import { formatFileSize } from "../../utils/fileSize";


type AssetVersionsTableProps = {
  assets: Asset[];
  canDelete: boolean;
  onDownload: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
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
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "text/plain": "TXT",
  };

  return types[mimeType] ?? mimeType;
}


export function AssetVersionsTable({
  assets,
  canDelete,
  onDownload,
  onDelete,
}: AssetVersionsTableProps) {
  if (assets.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No file versions have been uploaded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Version</th>
            <th className="min-w-64 px-4 py-3 font-semibold">File Name</th>
            <th className="px-4 py-3 font-semibold">Asset Type</th>
            <th className="px-4 py-3 font-semibold">File Type</th>
            <th className="px-4 py-3 font-semibold">Size</th>
            <th className="px-4 py-3 font-semibold">Primary</th>
            <th className="px-4 py-3 font-semibold">Uploaded By</th>
            <th className="px-4 py-3 font-semibold">Uploaded Date</th>
            <th className="px-4 py-3 font-semibold">Checksum</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {assets.map((asset) => (
            <tr key={asset.id} className={asset.is_deleted ? "bg-slate-50 text-slate-400" : ""}>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
                v{asset.version_number}
              </td>
              <td className="px-4 py-4">
                <p className="break-words font-medium text-slate-950">
                  {asset.original_filename}
                </p>
                {asset.is_deleted && (
                  <p className="mt-1 text-xs font-medium text-slate-500">Deleted</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                  {assetTypeLabels[asset.asset_type]}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {readableFileType(asset.mime_type)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {formatFileSize(asset.file_size)}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <span
                  className={[
                    "inline-flex rounded-md px-2 py-1 text-xs font-semibold",
                    asset.is_primary
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {asset.is_primary ? "Primary" : "No"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {asset.uploaded_by?.full_name ?? `User ${asset.uploaded_by_id}`}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {formatDateTime(asset.created_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600">
                {shortChecksum(asset.checksum_sha256)}
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onDownload(asset)}
                    disabled={asset.is_deleted}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download
                  </button>
                  {canDelete && onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(asset)}
                      disabled={asset.is_deleted}
                      className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

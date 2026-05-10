import { formatFileSize } from "../../utils/fileSize";
import type { AssetPreview, ViewerAsset } from "../../types/asset";


type PreviewFallbackProps = {
  asset: ViewerAsset | null;
  preview: AssetPreview | null;
  errorMessage?: string | null;
  onDownload?: (asset: ViewerAsset) => void;
  onRetry?: () => void;
  isRetrying?: boolean;
};


export function PreviewFallback({
  asset,
  preview,
  errorMessage,
  onDownload,
  onRetry,
  isRetrying = false,
}: PreviewFallbackProps) {
  const reason = errorMessage || preview?.conversion_error || "A browser preview is not available for this file.";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Preview unavailable</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{reason}</p>
          {asset && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">File</dt>
                <dd className="mt-1 break-words font-medium text-slate-950">{asset.original_filename}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</dt>
                <dd className="mt-1 font-medium text-slate-950">{asset.mime_type || "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Size</dt>
                <dd className="mt-1 font-medium text-slate-950">{formatFileSize(asset.file_size)}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {asset && onDownload && (
            <button
              type="button"
              onClick={() => onDownload(asset)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              Download
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              disabled={isRetrying}
              onClick={onRetry}
              className="inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isRetrying ? "Generating..." : "Generate Preview"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SummaryCard } from "../ui/SummaryCard";
import type { ContentVersion } from "../../types/contentVersion";
import { assetTypeLabels, contentStageLabels } from "../../types/contentVersion";
import { formatFileSize } from "../../utils/fileSize";


type ContentVersionsSectionProps = {
  versions: ContentVersion[];
  isLoading?: boolean;
  errorMessage?: string | null;
  title?: string;
  subtitle?: ReactNode;
  onDownload?: (version: ContentVersion) => void;
};


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function getAssetTypeLabel(version: ContentVersion): string {
  const assetType = version.asset?.asset_type;
  return assetType ? assetTypeLabels[assetType] : "Supporting File";
}


function getStageLabel(version: ContentVersion): string {
  return version.content_stage ? contentStageLabels[version.content_stage] : "Not Staged";
}


function getBadgeClass(kind: "asset" | "stage" | "current" | "final"): string {
  const classes = {
    asset: "border-sky-200 bg-sky-50 text-sky-800",
    stage: "border-violet-200 bg-violet-50 text-violet-800",
    current: "border-emerald-200 bg-emerald-50 text-emerald-700",
    final: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return [
    "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
    classes[kind],
  ].join(" ");
}


function getFileName(version: ContentVersion): string {
  return version.asset?.original_filename ?? `Asset ${version.asset_id}`;
}


export function ContentVersionsSection({
  versions,
  isLoading = false,
  errorMessage = null,
  title = "Content Versions",
  subtitle = "Meaningful content iterations linked to this request or document.",
  onDownload,
}: ContentVersionsSectionProps) {
  return (
    <SummaryCard title={title} subtitle={subtitle}>
      {isLoading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-md border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {errorMessage}
        </div>
      ) : versions.length === 0 ? (
        <EmptyState
          title="No content versions yet."
          description="Upload a review file to create the first content version."
        />
      ) : (
        <div className="grid gap-4">
          {versions.map((version) => (
            <article
              key={version.id}
              className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="break-words text-sm font-semibold text-slate-950">
                      {version.version_label || `V${version.version_number}`}
                    </h4>
                    <span className={getBadgeClass("asset")}>{getAssetTypeLabel(version)}</span>
                    <span className={getBadgeClass("stage")}>{getStageLabel(version)}</span>
                    {version.is_current && (
                      <span className={getBadgeClass("current")}>Current</span>
                    )}
                    {version.is_final_approved && (
                      <span className={getBadgeClass("final")}>Final Approved</span>
                    )}
                  </div>
                  <p className="mt-2 break-words text-sm font-medium text-slate-800">
                    {getFileName(version)}
                  </p>
                </div>

                {version.asset && onDownload && (
                  <button
                    type="button"
                    onClick={() => onDownload(version)}
                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    Download
                  </button>
                )}
              </div>

              <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Version Number" value={`V${version.version_number}`} />
                <DetailItem label="Created By" value={version.created_by?.full_name ?? `User ${version.created_by_id}`} />
                <DetailItem label="Created" value={formatDateTime(version.created_at)} />
                <DetailItem label="File Size" value={version.asset ? formatFileSize(version.asset.file_size) : "Not set"} />
                <DetailItem label="Content Type" value={version.asset?.mime_type ?? "Not set"} />
                <DetailItem label="Format" value={version.file_format || "Not set"} />
                <DetailItem label="Agency" value={version.agency?.name ?? "Not set"} />
                <DetailItem label="Language" value={version.language?.name ?? "Not set"} />
              </dl>

              <div className="mt-4 rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Change Summary
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {version.change_summary || "No change summary provided."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </SummaryCard>
  );
}


type DetailItemProps = {
  label: string;
  value: ReactNode;
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

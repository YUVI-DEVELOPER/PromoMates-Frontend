import { useMemo, useState } from "react";

import { EmptyState } from "../ui/EmptyState";
import { StatusBadge, getStatusLabel } from "../ui/StatusBadge";
import { SummaryCard } from "../ui/SummaryCard";
import type {
  DesignJob,
  DesignJobHistory,
  DesignJobUploadPayload,
} from "../../types/designJob";
import type { ContentVersion } from "../../types/contentVersion";
import { assetTypeLabels } from "../../types/contentVersion";
import { formatFileSize } from "../../utils/fileSize";


type DesignJobPanelProps = {
  job: DesignJob | null;
  history: DesignJobHistory[];
  isLoading?: boolean;
  isActionLoading?: boolean;
  errorMessage?: string | null;
  canUpload: boolean;
  canSubmitForReview: boolean;
  canApprove: boolean;
  canRequestRevision: boolean;
  canCancel: boolean;
  onUpload: (file: File, payload: DesignJobUploadPayload) => Promise<void>;
  onSubmitForReview: (comment?: string | null) => Promise<void>;
  onApprove: (comment?: string | null) => Promise<void>;
  onRequestRevision: (comment?: string | null) => Promise<void>;
  onCancel: (comment?: string | null) => Promise<void>;
  onDownloadVersion?: (version: ContentVersion) => void;
};


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}


function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function detailValue(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "Not set";
  }
  return value;
}


export function DesignJobPanel({
  job,
  history,
  isLoading = false,
  isActionLoading = false,
  errorMessage = null,
  canUpload,
  canSubmitForReview,
  canApprove,
  canRequestRevision,
  canCancel,
  onUpload,
  onSubmitForReview,
  onApprove,
  onRequestRevision,
  onCancel,
  onDownloadVersion,
}: DesignJobPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [assetType, setAssetType] = useState<"DESIGN_DRAFT" | "DIGITAL_ASSET">("DESIGN_DRAFT");
  const sortedHistory = useMemo(
    () =>
      [...history].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [history],
  );

  if (isLoading) {
    return (
      <SummaryCard
        title="Design Production"
        subtitle="Production state, uploads, and review decisions for this request."
      >
        <div className="grid gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-md border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </SummaryCard>
    );
  }

  if (!job) {
    return (
      <SummaryCard
        title="Design Production"
        subtitle="Production state, uploads, and review decisions for this request."
      >
        {errorMessage ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {errorMessage}
          </div>
        ) : (
          <EmptyState
            title="No design job yet"
            description="Send this request to design after MLR approval and MLR code issuance."
          />
        )}
      </SummaryCard>
    );
  }

  const activeJob = job;

  async function handleUpload() {
    if (!file) {
      return;
    }

    await onUpload(file, {
      asset_type: assetType,
      content_stage: "DESIGN",
      version_label: versionLabel || null,
      change_summary: changeSummary || null,
      is_primary: false,
      document_id: activeJob.source_document_id,
    });
    setFile(null);
    setVersionLabel("");
    setChangeSummary("");
    setAssetType("DESIGN_DRAFT");
  }

  async function handleRequestRevision() {
    const comment = window.prompt("Revision comment");
    if (comment === null) {
      return;
    }
    await onRequestRevision(comment.trim() || "Revision requested.");
  }

  async function handleCancel() {
    const comment = window.prompt("Cancellation reason");
    if (comment === null) {
      return;
    }
    await onCancel(comment.trim() || "Design job cancelled.");
  }

  async function handleApprove() {
    const comment = window.prompt("Approval comment (optional)");
    if (comment === null) {
      return;
    }
    await onApprove(comment.trim() || null);
  }

  const canUploadNow =
    canUpload &&
    (activeJob.status === "IN_PROGRESS" || activeJob.status === "REVISION_REQUESTED");
  const canSubmitNow =
    canSubmitForReview &&
    (activeJob.status === "IN_PROGRESS" || activeJob.status === "REVISION_REQUESTED") &&
    Boolean(activeJob.current_design_content_version_id);
  const canApproveNow = canApprove && activeJob.status === "READY_FOR_REVIEW";
  const canRequestRevisionNow = canRequestRevision && activeJob.status === "READY_FOR_REVIEW";
  const canCancelNow =
    canCancel &&
    ["DRAFT", "IN_PROGRESS", "REVISION_REQUESTED", "READY_FOR_REVIEW"].includes(activeJob.status);

  return (
    <SummaryCard
      title="Design Production"
      subtitle="Production state, uploads, and review decisions for this request."
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={activeJob.status} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {getStatusLabel(activeJob.status)}
            </span>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Agency" value={activeJob.agency?.name ?? "Not set"} />
            <DetailRow
              label="Assigned Designer"
              value={activeJob.assigned_designer?.full_name ?? "Not assigned"}
            />
            <DetailRow
              label="Coordinator"
              value={activeJob.design_coordinator?.full_name ?? "Not assigned"}
            />
            <DetailRow label="Due Date" value={formatDate(activeJob.due_date)} />
            <DetailRow label="Revision Count" value={String(activeJob.revision_count)} />
            <DetailRow label="Started" value={formatDateTime(activeJob.started_at)} />
            <DetailRow label="Submitted" value={formatDateTime(activeJob.submitted_at)} />
            <DetailRow label="Completed" value={formatDateTime(activeJob.completed_at)} />
            <DetailRow label="Cancelled" value={formatDateTime(activeJob.cancelled_at)} />
          </dl>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source Content
            </p>
            {activeJob.source_content_version ? (
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {activeJob.source_content_version.version_label ||
                    `V${activeJob.source_content_version.version_number}`}
                </p>
                <p>{activeJob.source_content_version.asset?.original_filename ?? "No asset name"}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No source content selected.</p>
            )}
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Design File
            </p>
            {activeJob.current_design_content_version ? (
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">
                  {activeJob.current_design_content_version.version_label ||
                    `V${activeJob.current_design_content_version.version_number}`}
                </p>
                <p>
                  {activeJob.current_design_content_version.asset?.original_filename ??
                    "No asset name"}
                </p>
                {activeJob.current_design_content_version.asset && (
                  <p className="text-xs text-slate-500">
                    {assetTypeLabels[activeJob.current_design_content_version.asset.asset_type]} /{" "}
                    {formatFileSize(activeJob.current_design_content_version.asset.file_size)}
                  </p>
                )}
                {activeJob.current_design_content_version.asset && onDownloadVersion && (
                  <button
                    type="button"
                    className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() =>
                      onDownloadVersion(activeJob.current_design_content_version as ContentVersion)
                    }
                  >
                    Download Current File
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No design draft uploaded yet.</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Brief
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {detailValue(activeJob.brief)}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Design Notes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {detailValue(activeJob.design_notes)}
            </p>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Action Rail
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {canUploadNow && (
                <button
                  type="button"
                  className="rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={handleUpload}
                  disabled={isActionLoading || !file}
                >
                  Upload Design Draft
                </button>
              )}
              {canSubmitNow && (
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onSubmitForReview(null)}
                  disabled={isActionLoading}
                >
                  Submit For Review
                </button>
              )}
              {canApproveNow && (
                <button
                  type="button"
                  className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={handleApprove}
                  disabled={isActionLoading}
                >
                  Approve Design
                </button>
              )}
              {canRequestRevisionNow && (
                <button
                  type="button"
                  className="rounded-md border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleRequestRevision}
                  disabled={isActionLoading}
                >
                  Request Revision
                </button>
              )}
              {canCancelNow && (
                <button
                  type="button"
                  className="rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleCancel}
                  disabled={isActionLoading}
                >
                  Cancel Design Job
                </button>
              )}
              {!canUploadNow &&
                !canSubmitNow &&
                !canApproveNow &&
                !canRequestRevisionNow &&
                !canCancelNow && (
                  <p className="text-sm text-slate-600">
                    No design actions are currently available for your role.
                  </p>
                )}
            </div>
          </div>
        </div>

        {canUploadNow && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Upload Draft
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  File
                </span>
                <input
                  type="file"
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  disabled={isActionLoading}
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Asset Type
                </span>
                <select
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={assetType}
                  onChange={(event) =>
                    setAssetType(event.target.value as "DESIGN_DRAFT" | "DIGITAL_ASSET")
                  }
                  disabled={isActionLoading}
                >
                  <option value="DESIGN_DRAFT">Design Draft</option>
                  <option value="DIGITAL_ASSET">Digital Asset</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Version Label
                </span>
                <input
                  type="text"
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={versionLabel}
                  onChange={(event) => setVersionLabel(event.target.value)}
                  placeholder="Design V2"
                  disabled={isActionLoading}
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Change Summary
                </span>
                <textarea
                  className="block min-h-[96px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={changeSummary}
                  onChange={(event) => setChangeSummary(event.target.value)}
                  placeholder="Describe what changed in this draft."
                  disabled={isActionLoading}
                />
              </label>
            </div>
          </div>
        )}

        <div className="rounded-md border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Timeline
          </p>
          {sortedHistory.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No design history yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {sortedHistory.map((entry) => (
                <li key={entry.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={entry.to_status} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {entry.action.split("_").join(" ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    {entry.from_status ? getStatusLabel(entry.from_status) : "Start"} to{" "}
                    {getStatusLabel(entry.to_status)}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {entry.comment}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(entry.created_at)} by{" "}
                    {entry.changed_by?.full_name ?? `User ${entry.changed_by_id}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </SummaryCard>
  );
}


type DetailRowProps = {
  label: string;
  value: string;
};


function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

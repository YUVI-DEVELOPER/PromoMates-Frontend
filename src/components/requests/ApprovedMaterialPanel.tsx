import type { ReactNode } from "react";

import type { ApprovedMaterial, ApprovedMaterialHistory } from "../../types/approvedMaterial";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge, getStatusLabel } from "../ui/StatusBadge";
import { SummaryCard } from "../ui/SummaryCard";


type ApprovedMaterialPanelProps = {
  material: ApprovedMaterial | null;
  history?: ApprovedMaterialHistory[];
  isLoading?: boolean;
  errorMessage?: string | null;
  historyErrorMessage?: string | null;
  canWithdraw?: boolean;
  isActionLoading?: boolean;
  onWithdraw?: (reason: string) => Promise<void> | void;
  title?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
};


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function isExpired(material: ApprovedMaterial): boolean {
  if (material.is_expired !== undefined) {
    return material.is_expired;
  }

  if (material.status !== "ACTIVE") {
    return false;
  }

  return new Date(material.valid_until).getTime() < Date.now();
}


function renderOptionalText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }
  return String(value);
}


export function ApprovedMaterialPanel({
  material,
  history = [],
  isLoading = false,
  errorMessage,
  historyErrorMessage,
  canWithdraw = false,
  isActionLoading = false,
  onWithdraw,
  title = "Approved Material",
  subtitle = "Final locked material created after final approval.",
  action,
}: ApprovedMaterialPanelProps) {
  async function handleWithdraw() {
    if (!material || !onWithdraw) {
      return;
    }

    const reason = window.prompt("Provide withdrawal reason", material.withdrawal_reason ?? "")?.trim();
    if (!reason) {
      return;
    }

    await onWithdraw(reason);
  }

  if (isLoading) {
    return (
      <SummaryCard title={title} subtitle={subtitle}>
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-16 animate-pulse rounded-md border border-slate-200 bg-slate-50" />
          ))}
        </div>
      </SummaryCard>
    );
  }

  if (errorMessage) {
    return (
      <SummaryCard title={title} subtitle={subtitle}>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {errorMessage}
        </div>
      </SummaryCard>
    );
  }

  if (!material) {
    return (
      <SummaryCard title={title} subtitle={subtitle}>
        <EmptyState title="Approved material has not been created yet." />
      </SummaryCard>
    );
  }

  const showExpiredWarning = isExpired(material);

  return (
    <SummaryCard
      title={title}
      subtitle={subtitle}
      action={
        <div className="flex items-center gap-2">
          {action}
          {canWithdraw && onWithdraw && material.status === "ACTIVE" && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => {
                void handleWithdraw();
              }}
              className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Withdraw
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-lg font-semibold text-slate-950">{material.material_code}</h4>
            <StatusBadge status={material.status} />
            {material.is_locked && (
              <span className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                Locked
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-slate-800">{material.material_title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Approved on {formatDate(material.approval_date)} by {renderOptionalText(material.approved_by_name ?? material.approved_by_id)}
          </p>
        </div>

        {showExpiredWarning && material.status === "ACTIVE" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This approved material is past validity ({formatDate(material.valid_until)}). It should no longer be distributed.
          </div>
        )}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="MLR Code" value={material.mlr_code || material.compliance_mlr_code || "Not set"} />
          <DetailItem label="Valid From" value={formatDate(material.valid_from)} />
          <DetailItem label="Valid Until" value={formatDate(material.valid_until)} />
          <DetailItem label="Request Number" value={renderOptionalText(material.request_number)} />
          <DetailItem label="Request Title" value={renderOptionalText(material.request_title)} />
          <DetailItem label="Document Number" value={renderOptionalText(material.document_number)} />
          <DetailItem label="Final Version" value={renderOptionalText(material.final_content_version_label)} />
          <DetailItem label="Final Asset" value={renderOptionalText(material.final_asset_filename)} />
          <DetailItem label="Withdrawal Reason" value={renderOptionalText(material.withdrawal_reason)} />
        </dl>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AssetCard
            title="Final Content Asset"
            filename={material.final_asset_filename}
            fallback={`Content Version ${material.final_content_version_id}`}
          />
          <AssetCard
            title="Digital Asset"
            filename={material.digital_asset_filename}
            fallback={material.digital_asset_id ? `Asset ${material.digital_asset_id}` : null}
          />
          <AssetCard
            title="Print-ready Asset"
            filename={material.print_ready_asset_filename}
            fallback={material.print_ready_asset_id ? `Asset ${material.print_ready_asset_id}` : null}
          />
        </div>

        <div>
          <h5 className="text-sm font-semibold text-slate-950">History</h5>
          {historyErrorMessage ? (
            <p className="mt-2 text-sm text-rose-700">{historyErrorMessage}</p>
          ) : history.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No history yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.to_status && <StatusBadge status={entry.to_status} />}
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {entry.action.split("_").join(" ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {entry.from_status ? getStatusLabel(entry.from_status) : "Start"}
                    {" -> "}
                    {entry.to_status ? getStatusLabel(entry.to_status) : "No Status Change"}
                  </p>
                  {entry.comment && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(entry.created_at)} by {entry.changed_by?.full_name ?? `User ${entry.changed_by_id}`}
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


type DetailItemProps = {
  label: string;
  value: ReactNode;
};


function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}


type AssetCardProps = {
  title: string;
  filename?: string | null;
  fallback?: string | null;
};


function AssetCard({ title, filename, fallback }: AssetCardProps) {
  const hasValue = Boolean(filename || fallback);

  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <h6 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h6>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">
        {hasValue ? filename || fallback : "Not provided"}
      </p>
    </article>
  );
}

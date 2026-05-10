import type { ReactNode } from "react";

import { StatusBadge, type StatusBadgeStatus } from "./StatusBadge";


export type HeroMetadataItem = {
  label: string;
  value: ReactNode;
};


type PageHeroSummaryProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: StatusBadgeStatus | string;
  statusLabel?: string;
  metadata?: HeroMetadataItem[];
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};


export function PageHeroSummary({
  eyebrow,
  title,
  subtitle,
  status,
  statusLabel,
  metadata = [],
  primaryAction,
  secondaryAction,
}: PageHeroSummaryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {eyebrow}
              </p>
            )}
            {status && <StatusBadge status={status} label={statusLabel} />}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-[1.65rem]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p>
          )}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row xl:justify-end">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>

      {metadata.length > 0 && (
        <dl className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {metadata.map((item) => (
            <div key={item.label} className="bg-slate-50 px-5 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-950">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

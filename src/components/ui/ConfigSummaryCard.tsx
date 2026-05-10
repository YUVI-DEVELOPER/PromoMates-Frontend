import type { ReactNode } from "react";
import { Link } from "react-router-dom";


type ConfigSummaryCardProps = {
  title: string;
  description: ReactNode;
  to?: string;
  onManage?: () => void;
  manageLabel?: string;
  metadata?: ReactNode;
};


export function ConfigSummaryCard({
  title,
  description,
  to,
  onManage,
  manageLabel = "Manage",
  metadata,
}: ConfigSummaryCardProps) {
  const content = (
    <>
      <div>
        <p className="text-base font-semibold text-slate-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {metadata && <div className="mt-4 text-xs font-medium text-slate-500">{metadata}</div>}
      <div className="mt-5">
        <span className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition group-hover:border-brand-300 group-hover:text-brand-700">
          {manageLabel}
        </span>
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="group block h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onManage}
      className="group h-full w-full rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"
    >
      {content}
    </button>
  );
}

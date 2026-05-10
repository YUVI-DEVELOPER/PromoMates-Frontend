import type { ReactNode } from "react";


type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  primaryAction?: ReactNode;
};


export function EmptyState({ title, description, icon, primaryAction }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      {icon && (
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>}
      {primaryAction && <div className="mt-5">{primaryAction}</div>}
    </div>
  );
}

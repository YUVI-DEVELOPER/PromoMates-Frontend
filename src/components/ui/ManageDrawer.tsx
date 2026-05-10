import type { ReactNode } from "react";

import { StatusBadge, type StatusBadgeStatus } from "./StatusBadge";


type ManageDrawerProps = {
  isOpen: boolean;
  title: string;
  subtitle?: ReactNode;
  status?: StatusBadgeStatus | string;
  statusLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};


export function ManageDrawer({
  isOpen,
  title,
  subtitle,
  status,
  statusLabel,
  children,
  footer,
  onClose,
}: ManageDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <aside className="flex h-full w-full max-w-[640px] flex-col border-l border-slate-200 bg-white shadow-xl">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
                {status && <StatusBadge status={status} label={statusLabel} />}
              </div>
              {subtitle && <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              Close
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

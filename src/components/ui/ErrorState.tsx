import type { ReactNode } from "react";


type ErrorStateProps = {
  message: string;
  technicalDetails?: ReactNode;
  onRetry?: () => void;
};


export function ErrorState({ message, technicalDetails, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Unable to load this section</p>
          <p className="mt-1 text-sm leading-6">{message}</p>
          {technicalDetails && (
            <div className="mt-3 rounded-md border border-rose-200 bg-white/70 p-3 text-xs">
              {technicalDetails}
            </div>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

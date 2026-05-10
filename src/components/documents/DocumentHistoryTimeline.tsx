import {
  DocumentStatusBadge,
  getDocumentStatusLabel,
} from "./DocumentStatusBadge";
import type { DocumentStateHistory } from "../../types/document";


type DocumentHistoryTimelineProps = {
  history: DocumentStateHistory[];
  isLoading: boolean;
};


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function DocumentHistoryTimeline({
  history,
  isLoading,
}: DocumentHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-600">
        Loading state history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No state history has been recorded yet.
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {history.map((entry) => (
        <li key={entry.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-600">
                  {getDocumentStatusLabel(entry.from_status)}
                </span>
                <span className="text-slate-400">to</span>
                <DocumentStatusBadge status={entry.to_status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {entry.reason || "No reason provided."}
              </p>
            </div>

            <div className="shrink-0 text-sm text-slate-600 md:text-right">
              <p className="font-medium text-slate-900">
                {entry.changed_by?.full_name ?? `User ${entry.changed_by_id}`}
              </p>
              <p className="mt-1">{formatDateTime(entry.created_at)}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

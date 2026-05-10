import type { DocumentVersion } from "../../types/document";


type DocumentVersionsTableProps = {
  versions: DocumentVersion[];
  isLoading: boolean;
};


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function DocumentVersionsTable({
  versions,
  isLoading,
}: DocumentVersionsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-600">
        Loading versions...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No metadata versions have been recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Version</th>
            <th className="px-4 py-3 font-semibold">Title Snapshot</th>
            <th className="px-4 py-3 font-semibold">Created By</th>
            <th className="px-4 py-3 font-semibold">Created At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {versions.map((version) => (
            <tr key={version.id}>
              <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
                v{version.version_number}
              </td>
              <td className="px-4 py-4 text-slate-700">{version.title_snapshot}</td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {version.created_by?.full_name ?? `User ${version.created_by_id}`}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                {formatDateTime(version.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

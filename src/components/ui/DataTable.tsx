import type { ReactNode } from "react";

import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";


export type DataTableColumn<Row> = {
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
};


type DataTableProps<Row> = {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => string | number;
  isLoading?: boolean;
  errorMessage?: string | null;
  emptyTitle: string;
  emptyDescription: string;
  loadingLabel?: string;
  actionsHeader?: string;
  renderActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  getRowClassName?: (row: Row) => string | undefined;
};


export function DataTable<Row>({
  rows,
  columns,
  getRowKey,
  isLoading = false,
  errorMessage,
  emptyTitle,
  emptyDescription,
  loadingLabel = "Loading records...",
  actionsHeader = "Actions",
  renderActions,
  onRowClick,
  getRowClassName,
}: DataTableProps<Row>) {
  if (isLoading) {
    return <LoadingState label={loadingLabel} />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} />;
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={["px-4 py-3 font-semibold", column.className]
                  .filter(Boolean)
                  .join(" ")}
              >
                {column.header}
              </th>
            ))}
            {renderActions && (
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {actionsHeader}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                "align-top transition",
                onRowClick ? "cursor-pointer hover:bg-slate-50/70" : "hover:bg-slate-50/70",
                getRowClassName?.(row),
              ].filter(Boolean).join(" ")}
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={["px-4 py-4", column.className].filter(Boolean).join(" ")}
                >
                  {column.render(row)}
                </td>
              ))}
              {renderActions && (
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">{renderActions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

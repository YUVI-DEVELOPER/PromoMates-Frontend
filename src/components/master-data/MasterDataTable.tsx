import type { ReactNode } from "react";

import { DataTable, type DataTableColumn } from "../ui/DataTable";


export type MasterDataTableColumn<Item> = {
  header: string;
  render: (item: Item) => ReactNode;
  className?: string;
};


type MasterDataTableProps<Item extends { id: number; is_active: boolean }> = {
  items: Item[];
  columns: MasterDataTableColumn<Item>[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onEdit: (item: Item) => void;
  onDeactivate: (item: Item) => void;
};


export function MasterDataTable<Item extends { id: number; is_active: boolean }>({
  items,
  columns,
  isLoading,
  emptyTitle,
  emptyDescription,
  onEdit,
  onDeactivate,
}: MasterDataTableProps<Item>) {
  return (
    <DataTable
      rows={items}
      columns={columns as DataTableColumn<Item>[]}
      getRowKey={(item) => item.id}
      isLoading={isLoading}
      loadingLabel="Loading master data..."
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      renderActions={(item) => (
        <>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDeactivate(item)}
            disabled={!item.is_active}
            className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deactivate
          </button>
        </>
      )}
    />
  );
}

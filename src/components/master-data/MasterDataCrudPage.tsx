import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../utils/apiError";
import { ErrorState } from "../ui/ErrorState";
import { KpiCard } from "../ui/KpiCard";
import { PageContainer } from "../ui/PageContainer";
import type {
  MasterDataBase,
  MasterDataListParams,
  MasterDataPayload,
} from "../../types/masterData";
import { MasterDataFormModal } from "./MasterDataFormModal";
import { MasterDataPageHeader } from "./MasterDataPageHeader";
import { MasterDataTable, type MasterDataTableColumn } from "./MasterDataTable";
import { StatusBadge } from "./StatusBadge";


type ModalState<Item> =
  | { mode: "create"; item: null }
  | { mode: "edit"; item: Item };


type MasterDataCrudPageProps<Item extends MasterDataBase> = {
  title: string;
  entityLabel: string;
  description: string;
  supportsDescription: boolean;
  codeTransform?: "uppercase" | "none";
  loadItems: (params?: MasterDataListParams) => Promise<Item[]>;
  createItem: (payload: MasterDataPayload) => Promise<Item>;
  updateItem: (id: number, payload: Partial<MasterDataPayload>) => Promise<Item>;
  deleteItem: (id: number) => Promise<Item>;
};


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function MasterDataCrudPage<Item extends MasterDataBase>({
  title,
  entityLabel,
  description,
  supportsDescription,
  codeTransform = "uppercase",
  loadItems,
  createItem,
  updateItem,
  deleteItem,
}: MasterDataCrudPageProps<Item>) {
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState<Item> | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextItems = await loadItems({ include_inactive: includeInactive });
      setItems(nextItems);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, loadItems]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) =>
      [
        item.name,
        item.code,
        item.description ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [items, searchTerm]);

  const activeCount = items.filter((item) => item.is_active).length;
  const inactiveCount = items.length - activeCount;

  const columns = useMemo<MasterDataTableColumn<Item>[]>(() => {
    const nextColumns: MasterDataTableColumn<Item>[] = [
      {
        header: "Name",
        render: (item) => (
          <div>
            <p className="font-medium text-slate-950">{item.name}</p>
            <p className="mt-1 text-xs text-slate-500">ID {item.id}</p>
          </div>
        ),
      },
      {
        header: "Code",
        render: (item) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {item.code}
          </span>
        ),
      },
    ];

    if (supportsDescription) {
      nextColumns.push({
        header: "Description",
        className: "min-w-72",
        render: (item) => (
          <span className="text-slate-600">{item.description || "No description"}</span>
        ),
      });
    }

    nextColumns.push(
      {
        header: "Status",
        render: (item) => <StatusBadge isActive={item.is_active} />,
      },
      {
        header: "Updated",
        render: (item) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTime(item.updated_at)}
          </span>
        ),
      },
    );

    return nextColumns;
  }, [supportsDescription]);

  async function handleSubmit(payload: MasterDataPayload) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (modalState?.mode === "edit") {
        const updatedItem = await updateItem(modalState.item.id, payload);
        setSuccessMessage(`Updated ${updatedItem.name}.`);
      } else {
        const createdItem = await createItem(payload);
        setSuccessMessage(`Created ${createdItem.name}.`);
      }

      setModalState(null);
      await fetchItems();
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(item: Item) {
    if (!window.confirm(`Deactivate ${item.name}? It will no longer appear in active lists.`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deactivatedItem = await deleteItem(item.id);
      setSuccessMessage(`Deactivated ${deactivatedItem.name}.`);
      await fetchItems();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  return (
    <PageContainer width="wide">
      <MasterDataPageHeader
        title={title}
        description={description}
        createLabel={`Create ${entityLabel}`}
        onCreate={() => {
          setFormErrorMessage(null);
          setModalState({ mode: "create", item: null });
        }}
      />

      {(errorMessage || successMessage) && (
        errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        )
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Records" value={items.length} helperText="Records in this module" status="info" />
        <KpiCard label="Active Records" value={activeCount} helperText="Available in document forms" status="success" />
        <KpiCard label="Inactive Records" value={inactiveCount} helperText="Hidden from active lists" status="neutral" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-slate-700" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, code, or description"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            Show inactive
          </label>
        </div>
      </div>

      <MasterDataTable
        items={filteredItems}
        columns={columns}
        isLoading={isLoading}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription="Create a record or adjust your filters."
        onEdit={(item) => {
          setFormErrorMessage(null);
          setModalState({ mode: "edit", item });
        }}
        onDeactivate={handleDeactivate}
      />

      <MasterDataFormModal
        isOpen={modalState !== null}
        mode={modalState?.mode ?? "create"}
        title={entityLabel}
        item={modalState?.item ?? null}
        supportsDescription={supportsDescription}
        codeTransform={codeTransform}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setModalState(null);
        }}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}

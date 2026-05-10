import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createDocumentSubtype,
  deleteDocumentSubtype,
  getDocumentSubtypes,
  getDocumentTypes,
  updateDocumentSubtype,
} from "../../../api/masterData";
import { DocumentSubtypeFormModal } from "../../../components/master-data/DocumentSubtypeFormModal";
import { MasterDataPageHeader } from "../../../components/master-data/MasterDataPageHeader";
import {
  MasterDataTable,
  type MasterDataTableColumn,
} from "../../../components/master-data/MasterDataTable";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import { ErrorState } from "../../../components/ui/ErrorState";
import { KpiCard } from "../../../components/ui/KpiCard";
import { PageContainer } from "../../../components/ui/PageContainer";
import type {
  DocumentSubtype,
  DocumentSubtypePayload,
  DocumentType,
} from "../../../types/masterData";
import { getApiErrorMessage } from "../../../utils/apiError";


type ModalState =
  | { mode: "create"; documentSubtype: null }
  | { mode: "edit"; documentSubtype: DocumentSubtype };


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function DocumentSubtypesPage() {
  const [documentSubtypes, setDocumentSubtypes] = useState<DocumentSubtype[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const documentTypeById = useMemo(
    () => new Map(documentTypes.map((documentType) => [documentType.id, documentType])),
    [documentTypes],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextDocumentSubtypes, nextDocumentTypes] = await Promise.all([
        getDocumentSubtypes({
          include_inactive: includeInactive,
          document_type_id: documentTypeFilter ? Number(documentTypeFilter) : undefined,
        }),
        getDocumentTypes({ include_inactive: false }),
      ]);
      setDocumentSubtypes(nextDocumentSubtypes);
      setDocumentTypes(nextDocumentTypes);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [documentTypeFilter, includeInactive]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredDocumentSubtypes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return documentSubtypes;
    }

    return documentSubtypes.filter((documentSubtype) => {
      const documentType = documentTypeById.get(documentSubtype.document_type_id);
      return [
        documentSubtype.name,
        documentSubtype.code,
        documentSubtype.description ?? "",
        documentType?.name ?? "",
        documentType?.code ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [documentSubtypes, documentTypeById, searchTerm]);

  const activeCount = documentSubtypes.filter((subtype) => subtype.is_active).length;
  const inactiveCount = documentSubtypes.length - activeCount;

  const columns = useMemo<MasterDataTableColumn<DocumentSubtype>[]>(
    () => [
      {
        header: "Subtype",
        render: (documentSubtype) => (
          <div>
            <p className="font-medium text-slate-950">{documentSubtype.name}</p>
            <p className="mt-1 text-xs text-slate-500">ID {documentSubtype.id}</p>
          </div>
        ),
      },
      {
        header: "Code",
        render: (documentSubtype) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {documentSubtype.code}
          </span>
        ),
      },
      {
        header: "Document Type",
        render: (documentSubtype) => {
          const documentType = documentTypeById.get(documentSubtype.document_type_id);
          return (
            <div>
              <p className="font-medium text-slate-900">
                {documentType?.name ?? "Unknown document type"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {documentType?.code ?? `Document type ID ${documentSubtype.document_type_id}`}
              </p>
            </div>
          );
        },
      },
      {
        header: "Description",
        className: "min-w-72",
        render: (documentSubtype) => (
          <span className="text-slate-600">
            {documentSubtype.description || "No description"}
          </span>
        ),
      },
      {
        header: "Status",
        render: (documentSubtype) => (
          <StatusBadge isActive={documentSubtype.is_active} />
        ),
      },
      {
        header: "Updated",
        render: (documentSubtype) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTime(documentSubtype.updated_at)}
          </span>
        ),
      },
    ],
    [documentTypeById],
  );

  async function handleSubmit(payload: DocumentSubtypePayload) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (modalState?.mode === "edit") {
        const updatedDocumentSubtype = await updateDocumentSubtype(
          modalState.documentSubtype.id,
          payload,
        );
        setSuccessMessage(`Updated ${updatedDocumentSubtype.name}.`);
      } else {
        const createdDocumentSubtype = await createDocumentSubtype(payload);
        setSuccessMessage(`Created ${createdDocumentSubtype.name}.`);
      }

      setModalState(null);
      await fetchData();
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(documentSubtype: DocumentSubtype) {
    if (
      !window.confirm(
        `Deactivate ${documentSubtype.name}? It will no longer appear in active lists.`,
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deactivatedDocumentSubtype = await deleteDocumentSubtype(documentSubtype.id);
      setSuccessMessage(`Deactivated ${deactivatedDocumentSubtype.name}.`);
      await fetchData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  return (
    <PageContainer width="wide">
      <MasterDataPageHeader
        title="Document Subtypes"
        description="Manage admin-defined document formats underneath document types."
        createLabel="Create Document Subtype"
        onCreate={() => {
          setFormErrorMessage(null);
          setModalState({ mode: "create", documentSubtype: null });
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
        <KpiCard label="Total Records" value={documentSubtypes.length} helperText="Document subtype records" status="info" />
        <KpiCard label="Active Records" value={activeCount} helperText="Available in document forms" status="success" />
        <KpiCard label="Inactive Records" value={inactiveCount} helperText="Hidden from active lists" status="neutral" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by subtype, code, document type, or description"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="document-type-filter"
            >
              Document Type
            </label>
            <select
              id="document-type-filter"
              value={documentTypeFilter}
              onChange={(event) => setDocumentTypeFilter(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All document types</option>
              {documentTypes.map((documentType) => (
                <option key={documentType.id} value={documentType.id}>
                  {documentType.name}
                </option>
              ))}
            </select>
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
        items={filteredDocumentSubtypes}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No document subtypes found"
        emptyDescription="Create a document subtype or adjust your filters."
        onEdit={(documentSubtype) => {
          setFormErrorMessage(null);
          setModalState({ mode: "edit", documentSubtype });
        }}
        onDeactivate={handleDeactivate}
      />

      <DocumentSubtypeFormModal
        isOpen={modalState !== null}
        mode={modalState?.mode ?? "create"}
        documentSubtype={modalState?.documentSubtype ?? null}
        documentTypes={documentTypes}
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

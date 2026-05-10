import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDocuments } from "../api/documents";
import {
  DocumentFilters,
  type DocumentFiltersValue,
} from "../components/documents/DocumentFilters";
import { DocumentTable } from "../components/documents/DocumentTable";
import { ErrorState } from "../components/ui/ErrorState";
import { KpiCard } from "../components/ui/KpiCard";
import { PageContainer } from "../components/ui/PageContainer";
import { PageHeroSummary } from "../components/ui/PageHeroSummary";
import { useAuth } from "../context/AuthContext";
import { useActiveTabRefreshNonce } from "../context/WorkspaceTabsContext";
import { useDocumentMasterData } from "../hooks/useDocumentMasterData";
import type {
  DocumentListItem,
  DocumentListParams,
  DocumentStatus,
} from "../types/document";
import { getApiErrorMessage } from "../utils/apiError";
import { canCreateRequests } from "../utils/access";


const initialFilters: DocumentFiltersValue = {
  search: "",
  status: "",
  brandId: "",
  productId: "",
  countryId: "",
  documentTypeId: "",
};


const pageSize = 20;
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100";


function toNumber(value: string): number | undefined {
  return value ? Number(value) : undefined;
}


export function DocumentLibrary() {
  const { hasPermission } = useAuth();
  const refreshNonce = useActiveTabRefreshNonce();
  const [filters, setFilters] = useState<DocumentFiltersValue>(initialFilters);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const masterData = useDocumentMasterData();
  const canCreateDocument = canCreateRequests(hasPermission);

  const fetchDocuments = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    const params: DocumentListParams = {
      search: filters.search.trim() || undefined,
      status: filters.status ? (filters.status as DocumentStatus) : undefined,
      brand_id: toNumber(filters.brandId),
      product_id: toNumber(filters.productId),
      country_id: toNumber(filters.countryId),
      document_type_id: toNumber(filters.documentTypeId),
      page,
      page_size: pageSize,
    };

    try {
      const response = await getDocuments(params);
      setDocuments(response.items);
      setTotal(response.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchDocuments(false);
  }, [fetchDocuments]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void fetchDocuments(true);
    }
  }, [refreshNonce]);

  function handleFilterChange(nextFilters: DocumentFiltersValue) {
    setFilters(nextFilters);
    setPage(1);
  }

  function handleClearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  const draftCount = documents.filter((document) => document.status === "DRAFT").length;
  const readyCount = documents.filter((document) => document.status === "READY_FOR_REVIEW").length;
  const approvedCount = documents.filter((document) => document.status === "APPROVED").length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Review Content"
        title="Content Library"
        subtitle={
          canCreateDocument
            ? "Create, search, filter, and manage review content used in MLR workflows."
            : "Search and review content available to your role."
        }
        status="ACTIVE"
        statusLabel="Active Library"
        metadata={[
          { label: "Visible Records", value: total },
          { label: "Ready On Page", value: readyCount },
        ]}
        primaryAction={
          canCreateDocument ? (
          <Link
            to="/library/create"
            className={primaryButtonClass}
          >
            Create Review Document
          </Link>
          ) : undefined
        }
      />

      {(errorMessage || masterData.errorMessage) && (
        <ErrorState message={errorMessage || masterData.errorMessage || "Unable to load library."} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Content"
          value={total}
          helperText="Matching current filters"
          status="info"
        />
        <KpiCard
          label="Draft"
          value={draftCount}
          helperText="Draft records on this page"
          status="neutral"
        />
        <KpiCard
          label="Ready for Review"
          value={readyCount}
          helperText="Ready records on this page"
          status="warning"
        />
        <KpiCard
          label="Approved"
          value={approvedCount}
          helperText="Approved records on this page"
          status="success"
        />
      </div>

      <DocumentFilters
        filters={filters}
        brands={masterData.brands}
        products={masterData.products}
        countries={masterData.countries}
        documentTypes={masterData.documentTypes}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      <DocumentTable
        documents={documents}
        isLoading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </PageContainer>
  );
}

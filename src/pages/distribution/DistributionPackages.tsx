import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getDistributionPackages } from "../../api/distribution";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useActiveTabRefreshNonce } from "../../context/WorkspaceTabsContext";
import type {
  DistributionPackage,
  DistributionPackageListParams,
  DistributionPackageStatus,
} from "../../types/distribution";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


type Filters = {
  search: string;
  status: string;
};


const pageSize = 20;
const statusOptions: DistributionPackageStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "RELEASED",
  "EXPIRED",
  "WITHDRAWN",
];


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


function summarizeTargets(packageItem: DistributionPackage): string {
  const regions = packageItem.target_region_ids?.length ?? 0;
  const users = packageItem.target_user_ids?.length ?? 0;
  if (!regions && !users) {
    return "All released users";
  }
  return [
    regions ? `${regions} region${regions === 1 ? "" : "s"}` : null,
    users ? `${users} user${users === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(", ");
}


export function DistributionPackages() {
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const refreshNonce = useActiveTabRefreshNonce();
  const [filters, setFilters] = useState<Filters>({ search: "", status: "" });
  const [packages, setPackages] = useState<DistributionPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canCreate = hasPermission(PERMISSIONS.CREATE_DISTRIBUTION);

  const fetchPackages = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    const params: DistributionPackageListParams = {
      search: filters.search.trim() || undefined,
      status: filters.status ? (filters.status as DistributionPackageStatus) : undefined,
      page,
      page_size: pageSize,
    };

    try {
      const response = await getDistributionPackages(params);
      setPackages(response.items);
      setTotal(response.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const statusParam = searchParams.get("status") ?? "";
    setFilters((currentFilters) =>
      currentFilters.status === statusParam
        ? currentFilters
        : { ...currentFilters, status: statusParam },
    );
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    void fetchPackages(false);
  }, [fetchPackages]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void fetchPackages(true);
    }
  }, [refreshNonce]);

  function updateFilter<FieldName extends keyof Filters>(fieldName: FieldName, value: Filters[FieldName]) {
    setFilters((currentFilters) => ({ ...currentFilters, [fieldName]: value }));
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Distribution"
        title="Distribution Packages"
        subtitle="Release final approved materials to sales teams with package-level availability and access tracking."
        status="RELEASED"
        statusLabel="Sales Enablement"
        metadata={[
          { label: "Matching Packages", value: total },
          { label: "Released On Page", value: packages.filter((item) => item.status === "RELEASED").length },
          { label: "Available Now", value: packages.filter((item) => item.is_currently_available).length },
          { label: "Drafts On Page", value: packages.filter((item) => item.status === "DRAFT").length },
        ]}
        primaryAction={
          canCreate ? (
            <Link
              to="/distribution/create"
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              Create Package
            </Link>
          ) : undefined
        }
      />

      {errorMessage && <ErrorState message={errorMessage} />}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)_auto] lg:items-end">
          <FilterText
            id="distribution-search"
            label="Search"
            value={filters.search}
            placeholder="Search package name, campaign, or instructions..."
            onChange={(value) => updateFilter("search", value)}
          />
          <FilterSelect
            id="distribution-status"
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </FilterSelect>
          <button
            type="button"
            onClick={() => {
              setFilters({ search: "", status: "" });
              setPage(1);
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </section>

      {isLoading ? (
        <LoadingState label="Loading distribution packages..." rows={4} />
      ) : packages.length === 0 ? (
        <EmptyState
          title="No distribution packages found"
          description="Create a package, add ACTIVE approved materials, then release it to sales reps."
        />
      ) : (
        <>
          <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Materials</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Release Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {packages.map((packageItem) => (
                  <tr key={packageItem.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{packageItem.package_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {packageItem.campaign_name || "No campaign"} / {summarizeTargets(packageItem)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={packageItem.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-600">{packageItem.material_count}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {packageItem.created_by_name || `User ${packageItem.created_by_id}`}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(packageItem.release_date)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Link
                          to={`/distribution/${packageItem.id}`}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {packages.map((packageItem) => (
              <Link
                key={packageItem.id}
                to={`/distribution/${packageItem.id}`}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-brand-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Package</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">{packageItem.package_name}</h3>
                  </div>
                  <StatusBadge status={packageItem.status} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <MobileDetail label="Materials" value={String(packageItem.material_count)} />
                  <MobileDetail label="Release" value={formatDate(packageItem.release_date)} />
                  <MobileDetail label="Expiry" value={formatDate(packageItem.expiry_date)} />
                  <MobileDetail label="Targets" value={summarizeTargets(packageItem)} />
                </dl>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Page {page} of {totalPages}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}


type FilterTextProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};


function FilterText({ id, label, value, placeholder, onChange }: FilterTextProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}


type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
};


function FilterSelect({ id, label, value, children, onChange }: FilterSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
    </div>
  );
}


type MobileDetailProps = {
  label: string;
  value: string;
};


function MobileDetail({ label, value }: MobileDetailProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}

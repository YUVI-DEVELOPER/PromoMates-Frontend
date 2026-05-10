import type { ReactNode } from "react";

import type { Brand, Country, DocumentType, Product } from "../../types/masterData";
import type { DocumentStatus } from "../../types/document";


export type DocumentFiltersValue = {
  search: string;
  status: DocumentStatus | "";
  brandId: string;
  productId: string;
  countryId: string;
  documentTypeId: string;
};


type DocumentFiltersProps = {
  filters: DocumentFiltersValue;
  brands: Brand[];
  products: Product[];
  countries: Country[];
  documentTypes: DocumentType[];
  onChange: (filters: DocumentFiltersValue) => void;
  onClear: () => void;
};


const statusOptions: { value: DocumentStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "READY_FOR_REVIEW", label: "Ready for Review" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];


export function DocumentFilters({
  filters,
  brands,
  products,
  countries,
  documentTypes,
  onChange,
  onClear,
}: DocumentFiltersProps) {
  const filteredProducts = filters.brandId
    ? products.filter((product) => product.brand_id === Number(filters.brandId))
    : products;

  function updateFilter<FieldName extends keyof DocumentFiltersValue>(
    fieldName: FieldName,
    value: DocumentFiltersValue[FieldName],
  ) {
    const nextFilters = {
      ...filters,
      [fieldName]: value,
    };

    if (fieldName === "brandId") {
      nextFilters.productId = "";
    }

    onChange(nextFilters);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Filters</h3>
          <p className="mt-1 text-sm text-slate-600">
            Narrow the library by status, market, product, or material type.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto] lg:items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="document-search">
            Search
          </label>
          <input
            id="document-search"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search title, number, description, keywords"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <FilterSelect
          id="document-status-filter"
          label="Status"
          value={filters.status}
          onChange={(value) => updateFilter("status", value as DocumentStatus | "")}
        >
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="document-brand-filter"
          label="Brand"
          value={filters.brandId}
          onChange={(value) => updateFilter("brandId", value)}
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="document-product-filter"
          label="Product"
          value={filters.productId}
          onChange={(value) => updateFilter("productId", value)}
        >
          <option value="">All products</option>
          {filteredProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="document-country-filter"
          label="Country"
          value={filters.countryId}
          onChange={(value) => updateFilter("countryId", value)}
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="document-type-filter"
          label="Document Type"
          value={filters.documentTypeId}
          onChange={(value) => updateFilter("documentTypeId", value)}
        >
          <option value="">All types</option>
          {documentTypes.map((documentType) => (
            <option key={documentType.id} value={documentType.id}>
              {documentType.name}
            </option>
          ))}
        </FilterSelect>

        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}


type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};


function FilterSelect({ id, label, value, onChange, children }: FilterSelectProps) {
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

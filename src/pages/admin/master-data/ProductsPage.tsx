import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createProduct,
  deleteProduct,
  getBrands,
  getProducts,
  getTherapeuticAreas,
  updateProduct,
} from "../../../api/masterData";
import { MasterDataPageHeader } from "../../../components/master-data/MasterDataPageHeader";
import {
  MasterDataTable,
  type MasterDataTableColumn,
} from "../../../components/master-data/MasterDataTable";
import { ProductFormModal } from "../../../components/master-data/ProductFormModal";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import { ErrorState } from "../../../components/ui/ErrorState";
import { KpiCard } from "../../../components/ui/KpiCard";
import { PageContainer } from "../../../components/ui/PageContainer";
import type { Brand, Product, ProductPayload, TherapeuticArea } from "../../../types/masterData";
import { getApiErrorMessage } from "../../../utils/apiError";


type ModalState =
  | { mode: "create"; product: null }
  | { mode: "edit"; product: Product };


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [therapeuticAreas, setTherapeuticAreas] = useState<TherapeuticArea[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [brandFilter, setBrandFilter] = useState("");
  const [therapeuticAreaFilter, setTherapeuticAreaFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const brandById = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands],
  );
  const therapeuticAreaById = useMemo(
    () => new Map(therapeuticAreas.map((area) => [area.id, area])),
    [therapeuticAreas],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextProducts, nextBrands, nextTherapeuticAreas] = await Promise.all([
        getProducts({
          include_inactive: includeInactive,
          brand_id: brandFilter ? Number(brandFilter) : undefined,
          therapeutic_area_id: therapeuticAreaFilter ? Number(therapeuticAreaFilter) : undefined,
        }),
        getBrands({ include_inactive: false }),
        getTherapeuticAreas({ include_inactive: false }),
      ]);
      setProducts(nextProducts);
      setBrands(nextBrands);
      setTherapeuticAreas(nextTherapeuticAreas);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, includeInactive, therapeuticAreaFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      const brand = brandById.get(product.brand_id);
      const therapeuticArea = product.therapeutic_area_id
        ? therapeuticAreaById.get(product.therapeutic_area_id)
        : null;
      return [
        product.name,
        product.code,
        product.description ?? "",
        brand?.name ?? "",
        brand?.code ?? "",
        therapeuticArea?.name ?? "",
        therapeuticArea?.code ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [brandById, products, searchTerm, therapeuticAreaById]);

  const activeCount = products.filter((product) => product.is_active).length;
  const inactiveCount = products.length - activeCount;

  const columns = useMemo<MasterDataTableColumn<Product>[]>(
    () => [
      {
        header: "Product",
        render: (product) => (
          <div>
            <p className="font-medium text-slate-950">{product.name}</p>
            <p className="mt-1 text-xs text-slate-500">ID {product.id}</p>
          </div>
        ),
      },
      {
        header: "Code",
        render: (product) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {product.code}
          </span>
        ),
      },
      {
        header: "Brand",
        render: (product) => {
          const brand = brandById.get(product.brand_id);
          return (
            <div>
              <p className="font-medium text-slate-900">{brand?.name ?? "Unknown brand"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {brand?.code ?? `Brand ID ${product.brand_id}`}
              </p>
            </div>
          );
        },
      },
      {
        header: "Therapeutic Area",
        render: (product) => {
          const area = product.therapeutic_area_id
            ? therapeuticAreaById.get(product.therapeutic_area_id)
            : null;
          return area ? (
            <div>
              <p className="font-medium text-slate-900">{area.name}</p>
              <p className="mt-1 text-xs text-slate-500">{area.code}</p>
            </div>
          ) : (
            <span className="text-slate-500">Not set</span>
          );
        },
      },
      {
        header: "Description",
        className: "min-w-72",
        render: (product) => (
          <span className="text-slate-600">
            {product.description || "No description"}
          </span>
        ),
      },
      {
        header: "Status",
        render: (product) => <StatusBadge isActive={product.is_active} />,
      },
      {
        header: "Updated",
        render: (product) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTime(product.updated_at)}
          </span>
        ),
      },
    ],
    [brandById, therapeuticAreaById],
  );

  async function handleSubmit(payload: ProductPayload) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (modalState?.mode === "edit") {
        const updatedProduct = await updateProduct(modalState.product.id, payload);
        setSuccessMessage(`Updated ${updatedProduct.name}.`);
      } else {
        const createdProduct = await createProduct(payload);
        setSuccessMessage(`Created ${createdProduct.name}.`);
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

  async function handleDeactivate(product: Product) {
    if (!window.confirm(`Deactivate ${product.name}? It will no longer appear in active lists.`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deactivatedProduct = await deleteProduct(product.id);
      setSuccessMessage(`Deactivated ${deactivatedProduct.name}.`);
      await fetchData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  return (
    <PageContainer width="wide">
      <MasterDataPageHeader
        title="Products"
        description="Manage products associated with configured brands for document metadata."
        createLabel="Create Product"
        onCreate={() => {
          setFormErrorMessage(null);
          setModalState({ mode: "create", product: null });
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
        <KpiCard label="Total Records" value={products.length} helperText="Product records" status="info" />
        <KpiCard label="Active Records" value={activeCount} helperText="Available in document forms" status="success" />
        <KpiCard label="Inactive Records" value={inactiveCount} helperText="Hidden from active lists" status="neutral" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px_230px_auto] lg:items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by product, code, brand, or description"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="brand-filter">
              Brand
            </label>
            <select
              id="brand-filter"
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="therapeutic-area-filter">
              Therapeutic Area
            </label>
            <select
              id="therapeutic-area-filter"
              value={therapeuticAreaFilter}
              onChange={(event) => setTherapeuticAreaFilter(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All areas</option>
              {therapeuticAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
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
        items={filteredProducts}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No products found"
        emptyDescription="Create a product or adjust your filters."
        onEdit={(product) => {
          setFormErrorMessage(null);
          setModalState({ mode: "edit", product });
        }}
        onDeactivate={handleDeactivate}
      />

      <ProductFormModal
        isOpen={modalState !== null}
        mode={modalState?.mode ?? "create"}
        product={modalState?.product ?? null}
        brands={brands}
        therapeuticAreas={therapeuticAreas}
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

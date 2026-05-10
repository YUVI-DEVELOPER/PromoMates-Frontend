import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createLookupCategory,
  createLookupValue,
  deleteLookupCategory,
  deleteLookupValue,
  getLookupCategories,
  getLookupValues,
  updateLookupCategory,
  updateLookupValue,
} from "../../api/lookups";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { FormDraftNotice } from "../../components/ui/FormDraftNotice";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type {
  LookupCategory,
  LookupCategoryPayload,
  LookupSortOrderDirection,
  LookupSortOrderParity,
  LookupValue,
  LookupValuePayload,
} from "../../types/lookup";
import { getApiErrorMessage } from "../../utils/apiError";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";


type CategoryModalState =
  | { mode: "create"; category: null }
  | { mode: "edit"; category: LookupCategory };


type ValueModalState =
  | { mode: "create"; value: null }
  | { mode: "edit"; value: LookupValue };


type CategoryFormValues = {
  code: string;
  name: string;
  description: string;
  is_editable: boolean;
  is_active: boolean;
};


type ValueFormValues = {
  code: string;
  label: string;
  description: string;
  is_active: boolean;
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}


function categoryInitialValues(category: LookupCategory | null): CategoryFormValues {
  return {
    code: category?.code ?? "",
    name: category?.name ?? "",
    description: category?.description ?? "",
    is_editable: category?.is_editable ?? true,
    is_active: category?.is_active ?? true,
  };
}


function valueInitialValues(value: LookupValue | null): ValueFormValues {
  return {
    code: value?.code ?? "",
    label: value?.label ?? "",
    description: value?.description ?? "",
    is_active: value?.is_active ?? true,
  };
}


function applySortOrderView<T extends { sort_order: number }>(
  items: T[],
  direction: LookupSortOrderDirection,
  parity: LookupSortOrderParity,
  getLabel: (item: T) => string,
): T[] {
  return [
    ...items.filter((item) => {
      if (parity === "even") {
        return item.sort_order % 2 === 0;
      }
      if (parity === "odd") {
        return item.sort_order % 2 !== 0;
      }
      return true;
    }),
  ].sort((first, second) => {
    const sortComparison =
      direction === "high_to_low"
        ? second.sort_order - first.sort_order
        : first.sort_order - second.sort_order;
    if (sortComparison !== 0) {
      return sortComparison;
    }
    return getLabel(first).localeCompare(getLabel(second));
  });
}


export function LookupMaster() {
  const [categories, setCategories] = useState<LookupCategory[]>([]);
  const [values, setValues] = useState<LookupValue[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [valueSearchTerm, setValueSearchTerm] = useState("");
  const [sortOrderDirection, setSortOrderDirection] =
    useState<LookupSortOrderDirection>("low_to_high");
  const [sortOrderParity, setSortOrderParity] = useState<LookupSortOrderParity>("all");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModalState | null>(null);
  const [valueModal, setValueModal] = useState<ValueModalState | null>(null);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setErrorMessage(null);
    try {
      const nextCategories = await getLookupCategories({ include_inactive: includeInactive });
      setCategories(nextCategories);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [includeInactive]);

  const loadValues = useCallback(async () => {
    if (!selectedCategoryId) {
      setValues([]);
      return;
    }

    setIsLoadingValues(true);
    setErrorMessage(null);
    try {
      const nextValues = await getLookupValues({
        category_id: selectedCategoryId,
        include_inactive: includeInactive,
      });
      setValues(nextValues);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setValues([]);
    } finally {
      setIsLoadingValues(false);
    }
  }, [includeInactive, selectedCategoryId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(null);
      return;
    }
    if (!selectedCategoryId || !categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    void loadValues();
  }, [loadValues]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchedCategories = normalizedSearch
      ? categories.filter((category) =>
          [category.name, category.code, category.description ?? ""].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          ),
        )
      : categories;
    return applySortOrderView(
      matchedCategories,
      sortOrderDirection,
      sortOrderParity,
      (category) => category.name,
    );
  }, [categories, searchTerm, sortOrderDirection, sortOrderParity]);

  const filteredValues = useMemo(() => {
    const normalizedSearch = valueSearchTerm.trim().toLowerCase();
    const matchedValues = normalizedSearch
      ? values.filter((value) =>
          [value.label, value.code, value.description ?? ""].some((entry) =>
            entry.toLowerCase().includes(normalizedSearch),
          ),
        )
      : values;
    return applySortOrderView(
      matchedValues,
      sortOrderDirection,
      sortOrderParity,
      (value) => value.label,
    );
  }, [sortOrderDirection, sortOrderParity, valueSearchTerm, values]);

  const categoryColumns = useMemo<DataTableColumn<LookupCategory>[]>(
    () => [
      {
        header: "Category",
        className: "min-w-64",
        render: (category) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">{category.name}</p>
              {category.id === selectedCategoryId && (
                <span className="rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  Selected
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{category.description || "No description"}</p>
          </div>
        ),
      },
      {
        header: "Code",
        render: (category) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {category.code}
          </span>
        ),
      },
      {
        header: "Badges",
        render: (category) => (
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={category.is_active ? "ACTIVE" : "INACTIVE"} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {category.is_system ? "System" : "Custom"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {category.is_editable ? "Editable" : "Locked"}
            </span>
          </div>
        ),
      },
      {
        header: "Sort",
        render: (category) => <span className="text-slate-600">{category.sort_order}</span>,
      },
    ],
    [selectedCategoryId],
  );

  const valueColumns = useMemo<DataTableColumn<LookupValue>[]>(
    () => [
      {
        header: "Value",
        className: "min-w-64",
        render: (value) => (
          <div>
            <p className="font-medium text-slate-950">{value.label}</p>
            <p className="mt-1 text-xs text-slate-500">{value.description || "No description"}</p>
          </div>
        ),
      },
      {
        header: "Code",
        render: (value) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {value.code}
          </span>
        ),
      },
      {
        header: "Status",
        render: (value) => (
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={value.is_active ? "ACTIVE" : "INACTIVE"} />
            {value.is_system && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                System
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Sort",
        render: (value) => <span className="text-slate-600">{value.sort_order}</span>,
      },
      {
        header: "Updated",
        render: (value) => (
          <span className="whitespace-nowrap text-slate-600">{formatDateTime(value.updated_at)}</span>
        ),
      },
    ],
    [],
  );

  async function handleCategorySubmit(payload: LookupCategoryPayload) {
    setIsSubmitting(true);
    setFormErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (categoryModal?.mode === "edit") {
        const updated = await updateLookupCategory(categoryModal.category.id, payload);
        setSuccessMessage(`Updated ${updated.name}.`);
      } else {
        const created = await createLookupCategory(payload);
        setSelectedCategoryId(created.id);
        setSuccessMessage(`Created ${created.name}.`);
      }
      setCategoryModal(null);
      await loadCategories();
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleValueSubmit(payload: LookupValuePayload) {
    setIsSubmitting(true);
    setFormErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (valueModal?.mode === "edit") {
        const updated = await updateLookupValue(valueModal.value.id, payload);
        setSuccessMessage(`Updated ${updated.label}.`);
      } else {
        const created = await createLookupValue(payload);
        setSuccessMessage(`Created ${created.label}.`);
      }
      setValueModal(null);
      await loadValues();
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateCategory(category: LookupCategory) {
    if (!window.confirm(`Deactivate ${category.name}? Its values will stop appearing in active lookup lists.`)) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await deleteLookupCategory(category.id);
      setSuccessMessage(`Deactivated ${updated.name}.`);
      await loadCategories();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleDeactivateValue(value: LookupValue) {
    if (!window.confirm(`Deactivate ${value.label}? It will stop appearing in active lookup lists.`)) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await deleteLookupValue(value.id);
      setSuccessMessage(`Deactivated ${updated.label}.`);
      await loadValues();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  const activeCategories = categories.filter((category) => category.is_active).length;
  const activeValues = values.filter((value) => value.is_active).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Console"
        title="Lookup Master"
        subtitle="Create and maintain configurable lookup categories and values used by request, compliance, and sales flows."
        status="ACTIVE"
        statusLabel="Lookup Configuration"
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setFormErrorMessage(null);
              setCategoryModal({ mode: "create", category: null });
            }}
            className={primaryButtonClass}
          >
            Create Category
          </button>
        }
        secondaryAction={
          <button
            type="button"
            disabled={!selectedCategory}
            onClick={() => {
              setFormErrorMessage(null);
              setValueModal({ mode: "create", value: null });
            }}
            className={primaryButtonClass}
          >
            Create Value
          </button>
        }
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
        <KpiCard label="Categories" value={categories.length} helperText={`${activeCategories} active`} status="info" />
        <KpiCard label="Selected Values" value={values.length} helperText={`${activeValues} active`} status="success" />
        <KpiCard label="Selected Category" value={selectedCategory?.code ?? "None"} helperText={selectedCategory?.name ?? "Choose a category"} status="neutral" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_10rem]">
            <label className="block text-sm font-medium text-slate-700" htmlFor="lookup-category-search">
              Search categories
              <input
                id="lookup-category-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by code, name, or description"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="lookup-value-search">
              Search values
              <input
                id="lookup-value-search"
                value={valueSearchTerm}
                onChange={(event) => setValueSearchTerm(event.target.value)}
                placeholder="Search selected category values"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="lookup-sort-direction">
              Sort order
              <select
                id="lookup-sort-direction"
                value={sortOrderDirection}
                onChange={(event) =>
                  setSortOrderDirection(event.target.value as LookupSortOrderDirection)
                }
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
              >
                <option value="low_to_high">Low to high</option>
                <option value="high_to_low">High to low</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="lookup-sort-parity">
              Sort filter
              <select
                id="lookup-sort-parity"
                value={sortOrderParity}
                onChange={(event) => setSortOrderParity(event.target.value as LookupSortOrderParity)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All</option>
                <option value="even">Even</option>
                <option value="odd">Odd</option>
              </select>
            </label>
          </div>

          <label className="flex shrink-0 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
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

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <DataTable
          rows={filteredCategories}
          columns={categoryColumns}
          getRowKey={(category) => category.id}
          isLoading={isLoadingCategories}
          loadingLabel="Loading lookup categories..."
          emptyTitle="No lookup categories"
          emptyDescription="Create a category to start adding lookup values."
          renderActions={(category) => (
            <>
              <button
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={secondaryButtonClass}
              >
                Select
              </button>
              <button
                type="button"
                disabled={!category.is_editable}
                onClick={() => {
                  setFormErrorMessage(null);
                  setCategoryModal({ mode: "edit", category });
                }}
                className={secondaryButtonClass}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={!category.is_editable || !category.is_active}
                onClick={() => void handleDeactivateCategory(category)}
                className={dangerButtonClass}
              >
                Deactivate
              </button>
            </>
          )}
        />

        <DataTable
          rows={selectedCategory ? filteredValues : []}
          columns={valueColumns}
          getRowKey={(value) => value.id}
          isLoading={isLoadingValues}
          loadingLabel="Loading lookup values..."
          emptyTitle={selectedCategory ? `No values for ${selectedCategory.code}` : "No category selected"}
          emptyDescription={
            selectedCategory
              ? "Create a value for this category or adjust your filters."
              : "Select a lookup category to manage its values."
          }
          renderActions={(value) => (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormErrorMessage(null);
                  setValueModal({ mode: "edit", value });
                }}
                className={secondaryButtonClass}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={!value.is_active}
                onClick={() => void handleDeactivateValue(value)}
                className={dangerButtonClass}
              >
                Deactivate
              </button>
            </>
          )}
        />
      </div>

      <CategoryModal
        state={categoryModal}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setCategoryModal(null);
        }}
        onSubmit={handleCategorySubmit}
      />

      <ValueModal
        state={valueModal}
        category={selectedCategory}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setValueModal(null);
        }}
        onSubmit={handleValueSubmit}
      />
    </PageContainer>
  );
}


type CategoryModalProps = {
  state: CategoryModalState | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: LookupCategoryPayload) => Promise<void>;
};


function CategoryModal({ state, isSubmitting, submitError, onClose, onSubmit }: CategoryModalProps) {
  const draftKey = state
    ? state.mode === "create"
      ? "lookup-category:create"
      : `lookup-category:edit:${state.category.id}`
    : null;
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  } = useRedisFormDraft<CategoryFormValues>(draftKey);
  const [values, setValues] = useState<CategoryFormValues>(() => categoryInitialValues(null));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (state) {
      const nextInitialValues = categoryInitialValues(state.category);
      setValues(nextInitialValues);
      setLocalError(null);

      void loadDraft().then((draft) => {
        if (isMounted && draft) {
          setValues({ ...nextInitialValues, ...draft.payload });
        }
      });
    } else {
      resetDraftState();
    }

    return () => {
      isMounted = false;
    };
  }, [loadDraft, resetDraftState, state]);

  if (!state) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.code.trim() || !values.name.trim()) {
      setLocalError("Code and name are required.");
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: optionalText(values.description),
        is_editable: values.is_editable,
        is_active: values.is_active,
      });
      await clearDraft();
    } catch {
      return;
    }
  }

  async function handleSaveDraft() {
    await saveDraft(values);
  }

  return (
    <ModalShell title={state.mode === "create" ? "Create Lookup Category" : "Edit Lookup Category"} onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {(submitError || localError) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError || localError}
          </div>
        )}
        <FormDraftNotice
          state={draftState}
          updatedAt={draftUpdatedAt}
          expiresAt={draftExpiresAt}
          error={draftError}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="lookup-category-code"
            label="Code"
            value={values.code}
            onChange={(value) => setValues((current) => ({ ...current, code: value.toUpperCase() }))}
          />
          <TextInput
            id="lookup-category-name"
            label="Name"
            value={values.name}
            onChange={(value) => setValues((current) => ({ ...current, name: value }))}
          />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <CheckboxInput
              label="Editable"
              checked={values.is_editable}
              onChange={(checked) => setValues((current) => ({ ...current, is_editable: checked }))}
            />
            <CheckboxInput
              label="Active"
              checked={values.is_active}
              onChange={(checked) => setValues((current) => ({ ...current, is_active: checked }))}
            />
          </div>
          <label className="block sm:col-span-2 text-sm font-medium text-slate-700" htmlFor="lookup-category-description">
            Description
            <textarea
              id="lookup-category-description"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
        <ModalActions
          isSubmitting={isSubmitting}
          submitLabel={state.mode === "create" ? "Create Category" : "Save Changes"}
          onClose={onClose}
          onSaveDraft={() => void handleSaveDraft()}
          isSavingDraft={draftState === "saving"}
        />
      </form>
    </ModalShell>
  );
}


type ValueModalProps = {
  state: ValueModalState | null;
  category: LookupCategory | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: LookupValuePayload) => Promise<void>;
};


function ValueModal({ state, category, isSubmitting, submitError, onClose, onSubmit }: ValueModalProps) {
  const draftKey = state && category
    ? state.mode === "create"
      ? `lookup-value:${category.id}:create`
      : `lookup-value:${category.id}:edit:${state.value.id}`
    : null;
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  } = useRedisFormDraft<ValueFormValues>(draftKey);
  const [values, setValues] = useState<ValueFormValues>(() => valueInitialValues(null));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (state) {
      const nextInitialValues = valueInitialValues(state.value);
      setValues(nextInitialValues);
      setLocalError(null);

      void loadDraft().then((draft) => {
        if (isMounted && draft) {
          setValues({ ...nextInitialValues, ...draft.payload });
        }
      });
    } else {
      resetDraftState();
    }

    return () => {
      isMounted = false;
    };
  }, [loadDraft, resetDraftState, state]);

  if (!state || !category) {
    return null;
  }

  const activeCategory = category;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.code.trim() || !values.label.trim()) {
      setLocalError("Code and label are required.");
      return;
    }

    setLocalError(null);
    try {
      await onSubmit({
        category_id: activeCategory.id,
        code: values.code.trim().toUpperCase(),
        label: values.label.trim(),
        description: optionalText(values.description),
        is_active: values.is_active,
      });
      await clearDraft();
    } catch {
      return;
    }
  }

  async function handleSaveDraft() {
    await saveDraft(values);
  }

  return (
    <ModalShell
      title={state.mode === "create" ? `Create ${activeCategory.code} Value` : `Edit ${activeCategory.code} Value`}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {(submitError || localError) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError || localError}
          </div>
        )}
        <FormDraftNotice
          state={draftState}
          updatedAt={draftUpdatedAt}
          expiresAt={draftExpiresAt}
          error={draftError}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="lookup-value-code"
            label="Code"
            value={values.code}
            onChange={(value) => setValues((current) => ({ ...current, code: value.toUpperCase() }))}
          />
          <TextInput
            id="lookup-value-label"
            label="Label"
            value={values.label}
            onChange={(value) => setValues((current) => ({ ...current, label: value }))}
          />
          <div className="flex items-center sm:col-span-2">
            <CheckboxInput
              label="Active"
              checked={values.is_active}
              onChange={(checked) => setValues((current) => ({ ...current, is_active: checked }))}
            />
          </div>
          <label className="block sm:col-span-2 text-sm font-medium text-slate-700" htmlFor="lookup-value-description">
            Description
            <textarea
              id="lookup-value-description"
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
        <ModalActions
          isSubmitting={isSubmitting}
          submitLabel={state.mode === "create" ? "Create Value" : "Save Changes"}
          onClose={onClose}
          onSaveDraft={() => void handleSaveDraft()}
          isSavingDraft={draftState === "saving"}
        />
      </form>
    </ModalShell>
  );
}


type ModalShellProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};


function ModalShell({ title, children, onClose }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}


type ModalActionsProps = {
  isSubmitting: boolean;
  submitLabel: string;
  onClose: () => void;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
};


function ModalActions({
  isSubmitting,
  submitLabel,
  onClose,
  onSaveDraft,
  isSavingDraft = false,
}: ModalActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      {onSaveDraft && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting || isSavingDraft}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingDraft ? "Saving draft..." : "Save Draft"}
        </button>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}


type TextInputProps = {
  id: string;
  label: string;
  value: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
};


function TextInput({ id, label, value, type = "text", onChange }: TextInputProps) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}


type CheckboxInputProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};


function CheckboxInput({ label, checked, onChange }: CheckboxInputProps) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
      />
      {label}
    </label>
  );
}

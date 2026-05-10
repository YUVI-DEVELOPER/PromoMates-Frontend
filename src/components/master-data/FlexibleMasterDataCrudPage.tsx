import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../utils/apiError";
import { ErrorState } from "../ui/ErrorState";
import { KpiCard } from "../ui/KpiCard";
import { PageContainer } from "../ui/PageContainer";
import { FormDraftNotice } from "../ui/FormDraftNotice";
import type { MasterDataListParams } from "../../types/masterData";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { MasterDataPageHeader } from "./MasterDataPageHeader";
import { MasterDataTable, type MasterDataTableColumn } from "./MasterDataTable";


export type FieldValue = string | boolean;
export type FlexibleFormValues = Record<string, FieldValue>;


export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  data?: unknown;
};


export type FlexibleField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "checkbox" | "select" | "autocomplete";
  required?: boolean;
  transform?: "uppercase";
  options?: SelectOption[];
  loadOptions?: (query: string, values: FlexibleFormValues) => Promise<SelectOption[]>;
  onOptionSelect?: (
    option: SelectOption,
    values: FlexibleFormValues,
  ) => FlexibleFormValues | Promise<FlexibleFormValues>;
  disabledWhen?: (values: FlexibleFormValues) => boolean;
  minSearchLength?: number;
  placeholder?: string;
  helperText?: string;
  fullWidth?: boolean;
};


type ModalState<Item> =
  | { mode: "create"; item: null }
  | { mode: "edit"; item: Item };


type BaseItem = {
  id: number;
  name: string;
  is_active: boolean;
  updated_at: string;
};


type FlexibleMasterDataCrudPageProps<Item extends BaseItem, Payload> = {
  title: string;
  entityLabel: string;
  description: string;
  fields: FlexibleField[];
  columns: MasterDataTableColumn<Item>[];
  loadItems: (params?: MasterDataListParams) => Promise<Item[]>;
  createItem: (payload: Payload) => Promise<Item>;
  updateItem: (id: number, payload: Partial<Payload>) => Promise<Item>;
  deleteItem: (id: number) => Promise<Item>;
  getInitialValues: (item: Item | null) => FlexibleFormValues;
  buildPayload: (values: FlexibleFormValues) => Payload;
  getSearchValues: (item: Item) => string[];
};


type FlexibleFormModalProps<Payload> = {
  isOpen: boolean;
  mode: "create" | "edit";
  title: string;
  fields: FlexibleField[];
  initialValues: FlexibleFormValues;
  buildPayload: (values: FlexibleFormValues) => Payload;
  draftKey: string | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: Payload) => Promise<void>;
};


function getStringValue(values: FlexibleFormValues, fieldName: string): string {
  const value = values[fieldName];
  return typeof value === "string" ? value : "";
}


function getBooleanValue(values: FlexibleFormValues, fieldName: string): boolean {
  return values[fieldName] === true;
}


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function draftKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "master-data";
}


type AutocompleteFieldProps = {
  field: FlexibleField;
  values: FlexibleFormValues;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onApplyValues: (values: FlexibleFormValues) => void;
};


function AutocompleteField({
  field,
  values,
  value,
  error,
  disabled = false,
  onChange,
  onApplyValues,
}: AutocompleteFieldProps) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    const minSearchLength = field.minSearchLength ?? 1;
    if (disabled || !field.loadOptions || query.length < minSearchLength) {
      setOptions([]);
      setIsOpen(false);
      setLookupError(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      setLookupError(null);
      field
        .loadOptions?.(query, values)
        .then((nextOptions) => {
          if (isCancelled) {
            return;
          }
          setOptions(nextOptions);
          setIsOpen(isFocused && nextOptions.length > 0);
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }
          setOptions([]);
          setLookupError("Live suggestions are unavailable right now.");
          setIsOpen(false);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        });
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [disabled, field, isFocused, value, values]);

  async function selectOption(option: SelectOption) {
    onChange(option.value);
    setIsOpen(false);
    if (!field.onOptionSelect) {
      return;
    }
    const nextValues = await field.onOptionSelect(option, {
      ...values,
      [field.name]: option.value,
    });
    onApplyValues(nextValues);
  }

  return (
    <div className="relative">
      <input
        id={field.name}
        type="text"
        value={value}
        autoComplete="off"
        disabled={disabled}
        onFocus={() => {
          setIsFocused(true);
          if (!disabled && (options.length > 0 || isLoading)) {
            setIsOpen(options.length > 0);
          }
        }}
        onBlur={() =>
          window.setTimeout(() => {
            setIsFocused(false);
            setIsOpen(false);
          }, 120)
        }
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
      {(isOpen || isLoading) && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {isLoading && (
            <div className="px-3 py-2 text-sm text-slate-500">Loading live suggestions...</div>
          )}
          {!isLoading &&
            options.map((option) => (
              <button
                key={`${field.name}-${option.value}-${option.label}`}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm transition hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void selectOption(option);
                }}
              >
                <span className="font-medium text-slate-950">{option.label}</span>
                {option.description && (
                  <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                )}
              </button>
            ))}
        </div>
      )}
      {field.helperText && <p className="mt-1 text-xs text-slate-500">{field.helperText}</p>}
      {lookupError && <p className="mt-1 text-xs font-medium text-amber-700">{lookupError}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


function FlexibleFormModal<Payload>({
  isOpen,
  mode,
  title,
  fields,
  initialValues,
  buildPayload,
  draftKey,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: FlexibleFormModalProps<Payload>) {
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  } = useRedisFormDraft<FlexibleFormValues>(draftKey);
  const [values, setValues] = useState<FlexibleFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setValues(initialValues);
      setErrors({});

      void loadDraft().then((draft) => {
        if (isMounted && draft) {
          setValues({ ...initialValues, ...draft.payload });
        }
      });
    } else {
      resetDraftState();
    }

    return () => {
      isMounted = false;
    };
  }, [initialValues, isOpen, loadDraft, resetDraftState]);

  function updateValue(field: FlexibleField, value: FieldValue) {
    setValues((currentValues) => ({
      ...currentValues,
      [field.name]:
        field.transform === "uppercase" && typeof value === "string"
          ? value.toUpperCase()
          : value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field.name]: undefined,
    }));
  }

  function applyValues(nextValues: FlexibleFormValues) {
    setValues(nextValues);
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      Object.keys(nextValues).forEach((fieldName) => {
        nextErrors[fieldName] = undefined;
      });
      return nextErrors;
    });
  }

  function validateForm() {
    const nextErrors: Record<string, string | undefined> = {};

    fields.forEach((field) => {
      if (!field.required) {
        return;
      }

      const value = values[field.name];
      const isMissing =
        typeof value === "boolean" ? false : !String(value ?? "").trim();
      if (isMissing) {
        nextErrors[field.name] = `${field.label} is required.`;
      }
    });

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onSubmit(buildPayload(values));
      await clearDraft();
    } catch {
      return;
    }
  }

  async function handleSaveDraft() {
    await saveDraft(values);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-950">
            {mode === "create" ? `Create ${title}` : `Edit ${title}`}
          </h2>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={handleSubmit}>
          {submitError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          )}

          <FormDraftNotice
            state={draftState}
            updatedAt={draftUpdatedAt}
            expiresAt={draftExpiresAt}
            error={draftError}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const isDisabled = field.disabledWhen?.(values) ?? false;
              if (field.type === "checkbox") {
                return (
                  <label
                    key={field.name}
                    className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={getBooleanValue(values, field.name)}
                      onChange={(event) => updateValue(field, event.target.checked)}
                      disabled={isDisabled}
                      className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                    />
                    {field.label}
                  </label>
                );
              }

              const wrapperClass = field.fullWidth ? "sm:col-span-2" : "";
              return (
                <div key={field.name} className={wrapperClass}>
                  <label className="block text-sm font-medium text-slate-700" htmlFor={field.name}>
                    {field.label}
                  </label>
                  {field.type === "autocomplete" ? (
                    <AutocompleteField
                      field={field}
                      values={values}
                      value={getStringValue(values, field.name)}
                      error={errors[field.name]}
                      disabled={isDisabled}
                      onChange={(value) => updateValue(field, value)}
                      onApplyValues={applyValues}
                    />
                  ) : field.type === "textarea" ? (
                    <textarea
                      id={field.name}
                      value={getStringValue(values, field.name)}
                      onChange={(event) => updateValue(field, event.target.value)}
                      disabled={isDisabled}
                      rows={3}
                      placeholder={field.placeholder}
                      className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      value={getStringValue(values, field.name)}
                      onChange={(event) => updateValue(field, event.target.value)}
                      disabled={isDisabled}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">{field.placeholder ?? "Select an option"}</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      type={field.type}
                      value={getStringValue(values, field.name)}
                      onChange={(event) => updateValue(field, event.target.value)}
                      placeholder={field.placeholder}
                      disabled={isDisabled}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  )}
                  {field.type !== "autocomplete" && field.helperText && (
                    <p className="mt-1 text-xs text-slate-500">{field.helperText}</p>
                  )}
                  {field.type !== "autocomplete" && errors[field.name] && (
                    <p className="mt-1 text-xs font-medium text-rose-700">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={isSubmitting || draftState === "saving"}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {draftState === "saving" ? "Saving draft..." : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Saving..." : mode === "create" ? `Create ${title}` : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function FlexibleMasterDataCrudPage<Item extends BaseItem, Payload>({
  title,
  entityLabel,
  description,
  fields,
  columns,
  loadItems,
  createItem,
  updateItem,
  deleteItem,
  getInitialValues,
  buildPayload,
  getSearchValues,
}: FlexibleMasterDataCrudPageProps<Item, Payload>) {
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
      getSearchValues(item).some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [getSearchValues, items, searchTerm]);

  const activeCount = items.filter((item) => item.is_active).length;
  const inactiveCount = items.length - activeCount;

  const tableColumns = useMemo<MasterDataTableColumn<Item>[]>(
    () => [
      ...columns,
      {
        header: "Updated",
        render: (item) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTime(item.updated_at)}
          </span>
        ),
      },
    ],
    [columns],
  );

  const currentInitialValues = getInitialValues(modalState?.item ?? null);
  const currentDraftKey = modalState
    ? modalState.mode === "create"
      ? `master-data:${draftKeyPart(entityLabel)}:create`
      : `master-data:${draftKeyPart(entityLabel)}:edit:${modalState.item.id}`
    : null;

  async function handleSubmit(payload: Payload) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (modalState?.mode === "edit") {
        const updatedItem = await updateItem(modalState.item.id, payload as Partial<Payload>);
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
        <KpiCard label="Active Records" value={activeCount} helperText="Available in active lists" status="success" />
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
              placeholder="Search records"
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
        columns={tableColumns}
        isLoading={isLoading}
        emptyTitle={`No ${title.toLowerCase()} found`}
        emptyDescription="Create a record or adjust your filters."
        onEdit={(item) => {
          setFormErrorMessage(null);
          setModalState({ mode: "edit", item });
        }}
        onDeactivate={handleDeactivate}
      />

      <FlexibleFormModal
        isOpen={modalState !== null}
        mode={modalState?.mode ?? "create"}
        title={entityLabel}
        fields={fields}
        initialValues={currentInitialValues}
        buildPayload={buildPayload}
        draftKey={currentDraftKey}
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

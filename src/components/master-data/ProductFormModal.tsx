import { FormEvent, useEffect, useState } from "react";

import type { Brand, Product, ProductPayload, TherapeuticArea } from "../../types/masterData";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { FormDraftNotice } from "../ui/FormDraftNotice";


type ProductFormValues = {
  brand_id: string;
  therapeutic_area_id: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
};


type FormErrors = Partial<Record<keyof ProductFormValues, string>>;


type ProductFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  product: Product | null;
  brands: Brand[];
  therapeuticAreas: TherapeuticArea[];
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: ProductPayload) => Promise<void>;
};


function getInitialValues(mode: "create" | "edit", product: Product | null): ProductFormValues {
  if (mode === "edit" && product) {
    return {
      brand_id: String(product.brand_id),
      therapeutic_area_id: product.therapeutic_area_id ? String(product.therapeutic_area_id) : "",
      name: product.name,
      code: product.code,
      description: product.description ?? "",
      is_active: product.is_active,
    };
  }

  return {
    brand_id: "",
    therapeutic_area_id: "",
    name: "",
    code: "",
    description: "",
    is_active: true,
  };
}


export function ProductFormModal({
  isOpen,
  mode,
  product,
  brands,
  therapeuticAreas,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const draftKey = isOpen
    ? mode === "create"
      ? "master-data:product:create"
      : product
        ? `master-data:product:edit:${product.id}`
        : null
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
  } = useRedisFormDraft<ProductFormValues>(draftKey);
  const [values, setValues] = useState<ProductFormValues>(() =>
    getInitialValues(mode, product),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const initialValues = getInitialValues(mode, product);
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
  }, [isOpen, loadDraft, mode, product, resetDraftState]);

  function updateValue<FieldName extends keyof ProductFormValues>(
    fieldName: FieldName,
    value: ProductFormValues[FieldName],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: fieldName === "code" ? String(value).toUpperCase() : value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!values.brand_id) {
      nextErrors.brand_id = "Brand is required.";
    }
    if (!values.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!values.code.trim()) {
      nextErrors.code = "Code is required.";
    }

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
      await onSubmit({
        brand_id: Number(values.brand_id),
        therapeutic_area_id: values.therapeutic_area_id ? Number(values.therapeutic_area_id) : null,
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || null,
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-950">
            {mode === "create" ? "Create Product" : "Edit Product"}
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

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="brand_id">
              Brand
            </label>
            <select
              id="brand_id"
              value={values.brand_id}
              onChange={(event) => updateValue("brand_id", event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name} ({brand.code})
                </option>
              ))}
            </select>
            {errors.brand_id && (
              <p className="mt-1 text-xs font-medium text-rose-700">{errors.brand_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="therapeutic_area_id">
              Therapeutic Area
            </label>
            <select
              id="therapeutic_area_id"
              value={values.therapeutic_area_id}
              onChange={(event) => updateValue("therapeutic_area_id", event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">No therapeutic area</option>
              {therapeuticAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} ({area.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              {errors.name && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="code">
                Code
              </label>
              <input
                id="code"
                value={values.code}
                onChange={(event) => updateValue("code", event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              {errors.code && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.code}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={values.description}
              onChange={(event) => updateValue("description", event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(event) => updateValue("is_active", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            Active
          </label>

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
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Product" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

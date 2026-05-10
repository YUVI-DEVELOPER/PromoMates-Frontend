import { FormEvent, useEffect, useState } from "react";

import type { MasterDataBase, MasterDataPayload } from "../../types/masterData";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { FormDraftNotice } from "../ui/FormDraftNotice";


type MasterDataFormValues = {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
};


type FormErrors = Partial<Record<keyof MasterDataFormValues, string>>;


type MasterDataFormModalProps<Item extends MasterDataBase> = {
  isOpen: boolean;
  mode: "create" | "edit";
  title: string;
  item: Item | null;
  supportsDescription: boolean;
  codeTransform?: "uppercase" | "none";
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: MasterDataPayload) => Promise<void>;
};


function getInitialValues<Item extends MasterDataBase>(
  mode: "create" | "edit",
  item: Item | null,
): MasterDataFormValues {
  if (mode === "edit" && item) {
    return {
      name: item.name,
      code: item.code,
      description: item.description ?? "",
      is_active: item.is_active,
    };
  }

  return {
    name: "",
    code: "",
    description: "",
    is_active: true,
  };
}


function draftKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "master-data";
}


export function MasterDataFormModal<Item extends MasterDataBase>({
  isOpen,
  mode,
  title,
  item,
  supportsDescription,
  codeTransform = "uppercase",
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: MasterDataFormModalProps<Item>) {
  const [values, setValues] = useState<MasterDataFormValues>(() =>
    getInitialValues(mode, item),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const heading = mode === "create" ? `Create ${title}` : `Edit ${title}`;
  const submitLabel = mode === "create" ? `Create ${title}` : "Save changes";
  const draftKey = isOpen
    ? mode === "create"
      ? `master-data:${draftKeyPart(title)}:create`
      : item
        ? `master-data:${draftKeyPart(title)}:edit:${item.id}`
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
  } = useRedisFormDraft<MasterDataFormValues>(draftKey);

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const initialValues = getInitialValues(mode, item);
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
  }, [isOpen, item, loadDraft, mode, resetDraftState]);

  function updateValue<FieldName extends keyof MasterDataFormValues>(
    fieldName: FieldName,
    value: MasterDataFormValues[FieldName],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]:
        fieldName === "code" && typeof value === "string" && codeTransform === "uppercase"
          ? value.toUpperCase()
          : value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

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
        name: values.name.trim(),
        code: values.code.trim(),
        description: supportsDescription ? values.description.trim() || null : undefined,
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
          <h2 className="text-xl font-semibold text-slate-950">{heading}</h2>
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

          {supportsDescription && (
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
          )}

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
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from "react";

import type {
  Workflow,
  WorkflowCreatePayload,
  WorkflowUpdatePayload,
} from "../../types/workflow";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { FormDraftNotice } from "../ui/FormDraftNotice";
import { normalizeWorkflowCode } from "./workflowOptions";


type WorkflowFormValues = {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
};


type FormErrors = Partial<Record<keyof WorkflowFormValues, string>>;


type WorkflowFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  workflow: Workflow | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: WorkflowCreatePayload | WorkflowUpdatePayload) => Promise<void>;
};


function getInitialValues(mode: "create" | "edit", workflow: Workflow | null): WorkflowFormValues {
  if (mode === "edit" && workflow) {
    return {
      name: workflow.name,
      code: workflow.code,
      description: workflow.description ?? "",
      is_active: workflow.is_active,
      is_default: workflow.is_default,
    };
  }

  return {
    name: "",
    code: "",
    description: "",
    is_active: true,
    is_default: false,
  };
}


export function WorkflowFormModal({
  isOpen,
  mode,
  workflow,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: WorkflowFormModalProps) {
  const draftKey = isOpen
    ? mode === "create"
      ? "workflow:create"
      : workflow
        ? `workflow:edit:${workflow.id}`
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
  } = useRedisFormDraft<WorkflowFormValues>(draftKey);
  const [values, setValues] = useState<WorkflowFormValues>(() =>
    getInitialValues(mode, workflow),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const initialValues = getInitialValues(mode, workflow);
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
  }, [isOpen, loadDraft, mode, resetDraftState, workflow]);

  function updateValue<FieldName extends keyof WorkflowFormValues>(
    fieldName: FieldName,
    value: WorkflowFormValues[FieldName],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: fieldName === "code" ? normalizeWorkflowCode(String(value)) : value,
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

    if (mode === "create" && !values.code.trim()) {
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

    const basePayload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      is_active: values.is_active,
      is_default: values.is_default,
    };

    try {
      if (mode === "create") {
        await onSubmit({
          ...basePayload,
          code: normalizeWorkflowCode(values.code),
        });
        await clearDraft();
        return;
      }

      await onSubmit(basePayload);
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
            {mode === "create" ? "Create Workflow" : "Edit Workflow"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Define the workflow metadata used for MLR configuration.
          </p>
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
            <label className="block text-sm font-medium text-slate-700" htmlFor="workflow-name">
              Name
            </label>
            <input
              id="workflow-name"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            {errors.name && <p className="mt-1 text-xs font-medium text-rose-700">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="workflow-code">
              Code
            </label>
            <input
              id="workflow-code"
              value={values.code}
              disabled={mode === "edit"}
              onChange={(event) => updateValue("code", event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />
            {errors.code && <p className="mt-1 text-xs font-medium text-rose-700">{errors.code}</p>}
            {mode === "edit" && (
              <p className="mt-1 text-xs text-slate-500">Workflow code is fixed after creation.</p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="workflow-description"
            >
              Description
            </label>
            <textarea
              id="workflow-description"
              rows={3}
              value={values.description}
              onChange={(event) => updateValue("description", event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => updateValue("is_active", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Active
            </label>

            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_default}
                onChange={(event) => updateValue("is_default", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Primary workflow
            </label>
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
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Workflow" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

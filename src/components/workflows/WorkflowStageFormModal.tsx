import { FormEvent, useEffect, useState } from "react";

import type {
  WorkflowStage,
  WorkflowStageCreatePayload,
  WorkflowStageUpdatePayload,
} from "../../types/workflow";
import type { Role } from "../../types/user";
import type { UserGroupOption } from "../../types/userGroup";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { FormDraftNotice } from "../ui/FormDraftNotice";


type WorkflowStageFormValues = {
  stage_order: string;
  name: string;
  required_role_id: string;
  required_group_id: string;
  due_days: string;
  is_required: boolean;
  allow_parallel: boolean;
};


type FormErrors = Partial<Record<keyof WorkflowStageFormValues, string>>;


type WorkflowStageFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  stage: WorkflowStage | null;
  roles: Role[];
  groups: UserGroupOption[];
  nextStageOrder: number;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (
    payload: WorkflowStageCreatePayload | WorkflowStageUpdatePayload,
  ) => Promise<void>;
};


function getInitialValues(
  mode: "create" | "edit",
  stage: WorkflowStage | null,
  nextStageOrder: number,
): WorkflowStageFormValues {
  if (mode === "edit" && stage) {
    return {
      stage_order: String(stage.stage_order),
      name: stage.name,
      required_role_id: stage.required_role_id ? String(stage.required_role_id) : "",
      required_group_id: stage.required_group_id ? String(stage.required_group_id) : "",
      due_days: String(stage.due_days),
      is_required: stage.is_required,
      allow_parallel: stage.allow_parallel,
    };
  }

  return {
    stage_order: String(nextStageOrder),
    name: "",
    required_role_id: "",
    required_group_id: "",
    due_days: "3",
    is_required: true,
    allow_parallel: false,
  };
}


export function WorkflowStageFormModal({
  isOpen,
  mode,
  stage,
  roles,
  groups,
  nextStageOrder,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: WorkflowStageFormModalProps) {
  const draftKey = isOpen
    ? mode === "create"
      ? "workflow-stage:create"
      : stage
        ? `workflow-stage:edit:${stage.id}`
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
  } = useRedisFormDraft<WorkflowStageFormValues>(draftKey);
  const [values, setValues] = useState<WorkflowStageFormValues>(() =>
    getInitialValues(mode, stage, nextStageOrder),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const initialValues = getInitialValues(mode, stage, nextStageOrder);
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
  }, [isOpen, loadDraft, mode, nextStageOrder, resetDraftState, stage]);

  function updateValue<FieldName extends keyof WorkflowStageFormValues>(
    fieldName: FieldName,
    value: WorkflowStageFormValues[FieldName],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};
    const stageOrder = Number(values.stage_order);
    const dueDays = Number(values.due_days);

    if (!Number.isInteger(stageOrder) || stageOrder < 1) {
      nextErrors.stage_order = "Stage order must be 1 or greater.";
    }

    if (!values.name.trim()) {
      nextErrors.name = "Stage name is required.";
    }

    if (!values.required_role_id) {
      nextErrors.required_role_id = "Required role is required.";
    }

    if (!Number.isInteger(dueDays) || dueDays < 1) {
      nextErrors.due_days = "Due days must be 1 or greater.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !values.required_role_id) {
      return;
    }

    try {
      await onSubmit({
        stage_order: Number(values.stage_order),
        name: values.name.trim(),
        required_role_id: Number(values.required_role_id),
        required_group_id: values.required_group_id ? Number(values.required_group_id) : null,
        due_days: Number(values.due_days),
        is_required: values.is_required,
        allow_parallel: values.allow_parallel,
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
            {mode === "create" ? "Add Workflow Stage" : "Edit Workflow Stage"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure ordered reviewer responsibilities for this workflow.
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="stage-order"
              >
                Stage order
              </label>
              <input
                id="stage-order"
                type="number"
                min={1}
                value={values.stage_order}
                onChange={(event) => updateValue("stage_order", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              {errors.stage_order && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.stage_order}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="due-days">
                Due days
              </label>
              <input
                id="due-days"
                type="number"
                min={1}
                value={values.due_days}
                onChange={(event) => updateValue("due_days", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              {errors.due_days && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.due_days}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="stage-name">
              Stage name
            </label>
            <input
              id="stage-name"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            {errors.name && <p className="mt-1 text-xs font-medium text-rose-700">{errors.name}</p>}
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="required-role"
            >
              Required role
            </label>
            <select
              id="required-role"
              value={values.required_role_id}
              onChange={(event) =>
                updateValue("required_role_id", event.target.value)
              }
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({role.code})
                </option>
              ))}
            </select>
            {roles.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No active roles are available. Create roles in Role Master before assigning workflow stages.
              </p>
            )}
            {errors.required_role_id && (
              <p className="mt-1 text-xs font-medium text-rose-700">{errors.required_role_id}</p>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="required-group"
            >
              Required Group / Reviewer Pool
            </label>
            <select
              id="required-group"
              value={values.required_group_id}
              onChange={(event) =>
                updateValue("required_group_id", event.target.value)
              }
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">No group scope</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              If selected, tasks for this stage are claimable only by users in this group and the selected role.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_required}
                onChange={(event) => updateValue("is_required", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Required stage
            </label>

            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.allow_parallel}
                onChange={(event) => updateValue("allow_parallel", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Allow parallel review
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
              {isSubmitting ? "Saving..." : mode === "create" ? "Add Stage" : "Save Stage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

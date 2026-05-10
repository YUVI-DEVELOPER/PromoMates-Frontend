import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  createRole,
  deactivateRole,
  getPermissions,
  getRoles,
  updateRole,
  type RoleWritePayload,
} from "../../api/roles";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { FormDraftNotice } from "../../components/ui/FormDraftNotice";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { Permission, Role } from "../../types/user";
import { getApiErrorMessage } from "../../utils/apiError";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";


type ModalState =
  | { mode: "create"; role: null }
  | { mode: "edit"; role: Role };


type RoleFormValues = {
  code: string;
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";


function initialValues(role: Role | null): RoleFormValues {
  return {
    code: role?.code ?? "",
    name: role?.name ?? "",
    description: role?.description ?? "",
    permissions: role?.permissions ?? [],
    is_active: role?.is_active ?? true,
  };
}


function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}


export function RoleMaster() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [nextRoles, nextPermissions] = await Promise.all([
        getRoles(includeInactive),
        getPermissions(),
      ]);
      setRoles(nextRoles);
      setPermissions(nextPermissions);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return roles;
    }
    return roles.filter((role) =>
      [role.code, role.name, role.description ?? "", role.permissions.join(" ")].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
    );
  }, [roles, searchTerm]);

  const columns = useMemo<DataTableColumn<Role>[]>(
    () => [
      {
        header: "Role",
        className: "min-w-72",
        render: (role) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-950">{role.name}</p>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {role.code}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{role.description || "No description"}</p>
          </div>
        ),
      },
      {
        header: "Permissions",
        className: "min-w-80",
        render: (role) => (
          <div className="flex flex-wrap gap-1.5">
            {role.permissions.length > 0 ? (
              role.permissions.slice(0, 6).map((permission) => (
                <span
                  key={permission}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"
                >
                  {permission}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No permissions</span>
            )}
            {role.permissions.length > 6 && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                +{role.permissions.length - 6}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Status",
        render: (role) => (
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={role.is_active ? "ACTIVE" : "INACTIVE"} />
          </div>
        ),
      },
    ],
    [],
  );

  async function handleSubmit(payload: RoleWritePayload) {
    setIsSubmitting(true);
    setFormError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (modalState?.mode === "edit") {
        const updated = await updateRole(modalState.role.id, payload);
        setSuccessMessage(`Updated ${updated.name}.`);
      } else {
        const created = await createRole(payload);
        setSuccessMessage(`Created ${created.name}.`);
      }
      setModalState(null);
      await loadData();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(role: Role) {
    if (!window.confirm(`Deactivate ${role.name}? Users will stop receiving permissions from this role.`)) {
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await deactivateRole(role.id);
      setSuccessMessage(`Deactivated ${updated.name}.`);
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  const activeRoles = roles.filter((role) => role.is_active).length;
  const rolesWithPermissions = roles.filter((role) => role.permissions.length > 0).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Console"
        title="Role Master"
        subtitle="Create dynamic roles and assign backend-controlled permissions for users and workflow stages."
        status="ACTIVE"
        statusLabel="Dynamic RBAC"
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setModalState({ mode: "create", role: null });
            }}
            className={primaryButtonClass}
          >
            Create Role
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
        <KpiCard label="Roles" value={roles.length} helperText={`${activeRoles} active`} status="info" />
        <KpiCard label="Permission Keys" value={permissions.length} helperText="Backend capabilities" status="success" />
        <KpiCard label="Configured Roles" value={rolesWithPermissions} helperText="At least one permission" status="neutral" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <label className="block w-full max-w-xl text-sm font-medium text-slate-700" htmlFor="role-search">
            Search roles
            <input
              id="role-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by code, name, description, or permission"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </label>

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

      <DataTable
        rows={filteredRoles}
        columns={columns}
        getRowKey={(role) => role.id}
        isLoading={isLoading}
        loadingLabel="Loading roles..."
        emptyTitle="No roles"
        emptyDescription="Create roles, assign permissions, then add them to users and workflow stages."
        renderActions={(role) => (
          <>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setModalState({ mode: "edit", role });
              }}
              className={secondaryButtonClass}
            >
              Edit
            </button>
            <button
              type="button"
              disabled={!role.is_active}
              onClick={() => void handleDeactivate(role)}
              className={dangerButtonClass}
            >
              Deactivate
            </button>
          </>
        )}
      />

      <RoleModal
        state={modalState}
        permissions={permissions}
        isSubmitting={isSubmitting}
        submitError={formError}
        onClose={() => {
          setFormError(null);
          setModalState(null);
        }}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}


type RoleModalProps = {
  state: ModalState | null;
  permissions: Permission[];
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: RoleWritePayload) => Promise<void>;
};


function RoleModal({ state, permissions, isSubmitting, submitError, onClose, onSubmit }: RoleModalProps) {
  const draftKey = state
    ? state.mode === "create"
      ? "role:create"
      : `role:edit:${state.role.id}`
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
  } = useRedisFormDraft<RoleFormValues>(draftKey);
  const [values, setValues] = useState<RoleFormValues>(() => initialValues(null));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (state) {
      const nextInitialValues = initialValues(state.role);
      setValues(nextInitialValues);
      setLocalError(null);

      void loadDraft().then((draft) => {
        if (isMounted && draft) {
          setValues({
            ...nextInitialValues,
            ...draft.payload,
            permissions: Array.isArray(draft.payload.permissions)
              ? draft.payload.permissions.filter((permission): permission is string => typeof permission === "string")
              : nextInitialValues.permissions,
          });
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
  const activeState = state;

  function togglePermission(permissionKey: string) {
    setValues((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionKey)
        ? current.permissions.filter((key) => key !== permissionKey)
        : [...current.permissions, permissionKey],
    }));
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
        permissions: values.permissions,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-950">
            {activeState.mode === "create" ? "Create Role" : "Edit Role"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <form className="space-y-5 px-6 py-5" onSubmit={handleSubmit}>
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="role-code">
              Code
              <input
                id="role-code"
                value={values.code}
                onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700" htmlFor="role-name">
              Name
              <input
                id="role-name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block md:col-span-2 text-sm font-medium text-slate-700" htmlFor="role-description">
              Description
              <textarea
                id="role-description"
                value={values.description}
                onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => setValues((current) => ({ ...current, is_active: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Active
            </label>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Permissions</h3>
              <span className="text-xs font-medium text-slate-500">
                {values.permissions.length} selected
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {permissions.map((permission) => (
                <label
                  key={permission.key}
                  className="flex min-h-20 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={values.permissions.includes(permission.key)}
                    onChange={() => togglePermission(permission.key)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{permission.label}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">{permission.key}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
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
              {isSubmitting ? "Saving..." : activeState.mode === "create" ? "Create Role" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

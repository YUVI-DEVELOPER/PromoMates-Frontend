import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  addWorkflowStage,
  createWorkflow,
  deactivateWorkflow,
  deleteWorkflowStage,
  getDefaultWorkflow,
  getWorkflow,
  getWorkflows,
  updateWorkflow,
  updateWorkflowStage,
} from "../../api/workflows";
import { getRoleOptions } from "../../api/roles";
import { getUserGroupOptions } from "../../api/userGroups";
import { WorkflowFormModal } from "../../components/workflows/WorkflowFormModal";
import { WorkflowStageFormModal } from "../../components/workflows/WorkflowStageFormModal";
import { WorkflowStageList } from "../../components/workflows/WorkflowStageList";
import { WorkflowStepperPreview } from "../../components/workflows/WorkflowStepperPreview";
import { WorkflowSummaryCard } from "../../components/workflows/WorkflowSummaryCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import type {
  Workflow,
  WorkflowCreatePayload,
  WorkflowStage,
  WorkflowStageCreatePayload,
  WorkflowStageUpdatePayload,
  WorkflowUpdatePayload,
} from "../../types/workflow";
import type { Role } from "../../types/user";
import type { UserGroupOption } from "../../types/userGroup";
import { getApiErrorMessage } from "../../utils/apiError";


type WorkflowModalState =
  | { mode: "create"; workflow: null }
  | { mode: "edit"; workflow: Workflow };


type StageModalState =
  | { mode: "create"; stage: null }
  | { mode: "edit"; stage: WorkflowStage };


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function WorkflowSettings() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [defaultWorkflow, setDefaultWorkflow] = useState<Workflow | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [selectedWorkflowDetail, setSelectedWorkflowDetail] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [workflowModalState, setWorkflowModalState] = useState<WorkflowModalState | null>(null);
  const [stageModalState, setStageModalState] = useState<StageModalState | null>(null);

  const selectedWorkflow = useMemo(
    () =>
      selectedWorkflowDetail?.id === selectedWorkflowId
        ? selectedWorkflowDetail
        : workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [selectedWorkflowDetail, selectedWorkflowId, workflows],
  );

  const loadWorkflowConfiguration = useCallback(
    async (preferredWorkflowId?: number) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [nextWorkflows, nextDefaultWorkflow, nextRoles, nextGroups] = await Promise.all([
          getWorkflows({ include_inactive: true }),
          getDefaultWorkflow().catch(() => null),
          getRoleOptions(),
          getUserGroupOptions().catch(() => []),
        ]);
        const sortedWorkflows = [...nextWorkflows].sort((first, second) =>
          first.name.localeCompare(second.name),
        );
        setWorkflows(sortedWorkflows);
        setDefaultWorkflow(nextDefaultWorkflow);
        setRoles(nextRoles);
        setGroups(nextGroups);

        const nextSelectedId =
          preferredWorkflowId ??
          nextDefaultWorkflow?.id ??
          sortedWorkflows[0]?.id ??
          null;
        const nextSelectedWorkflow =
          nextSelectedId === null
            ? null
            : nextDefaultWorkflow?.id === nextSelectedId
              ? nextDefaultWorkflow
              : await getWorkflow(nextSelectedId);
        setSelectedWorkflowId(nextSelectedId);
        setSelectedWorkflowDetail(nextSelectedWorkflow);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadWorkflowConfiguration();
  }, [loadWorkflowConfiguration]);

  const totalStages = useMemo(
    () =>
      workflows.reduce(
        (count, workflow) => count + (workflow.stage_count ?? workflow.stages?.length ?? 0),
        0,
      ),
    [workflows],
  );
  const activeWorkflows = workflows.filter((workflow) => workflow.is_active).length;
  const nextStageOrder =
    selectedWorkflow?.stages && selectedWorkflow.stages.length > 0
      ? Math.max(...selectedWorkflow.stages.map((stage) => stage.stage_order)) + 1
      : 1;

  async function refreshAfterMutation(message: string, preferredWorkflowId?: number) {
    setSuccessMessage(message);
    await loadWorkflowConfiguration(preferredWorkflowId ?? selectedWorkflowId ?? undefined);
  }

  async function handleSubmitWorkflow(payload: WorkflowCreatePayload | WorkflowUpdatePayload) {
    setIsSubmitting(true);
    setFormErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (workflowModalState?.mode === "edit") {
        const updatedWorkflow = await updateWorkflow(
          workflowModalState.workflow.id,
          payload as WorkflowUpdatePayload,
        );
        setWorkflowModalState(null);
        await refreshAfterMutation(`Updated ${updatedWorkflow.name}.`, updatedWorkflow.id);
        return;
      }

      const createdWorkflow = await createWorkflow(payload as WorkflowCreatePayload);
      setWorkflowModalState(null);
      await refreshAfterMutation(`Created ${createdWorkflow.name}.`, createdWorkflow.id);
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivateWorkflow(workflow: Workflow) {
    if (!window.confirm(`Deactivate ${workflow.name}? It will no longer be available as an active workflow.`)) {
      return;
    }

    setBusyAction(`deactivate-${workflow.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deactivatedWorkflow = await deactivateWorkflow(workflow.id);
      await refreshAfterMutation(`Deactivated ${deactivatedWorkflow.name}.`, workflow.id);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitStage(
    payload: WorkflowStageCreatePayload | WorkflowStageUpdatePayload,
  ) {
    if (!selectedWorkflow) {
      return;
    }

    setIsSubmitting(true);
    setFormErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (stageModalState?.mode === "edit") {
        await updateWorkflowStage(
          selectedWorkflow.id,
          stageModalState.stage.id,
          payload as WorkflowStageUpdatePayload,
        );
        setStageModalState(null);
        await refreshAfterMutation("Workflow stage updated.", selectedWorkflow.id);
        return;
      }

      await addWorkflowStage(selectedWorkflow.id, payload as WorkflowStageCreatePayload);
      setStageModalState(null);
      await refreshAfterMutation("Workflow stage added.", selectedWorkflow.id);
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStage(stage: WorkflowStage) {
    if (!selectedWorkflow) {
      return;
    }

    if (!window.confirm(`Delete stage ${stage.stage_order}: ${stage.name}?`)) {
      return;
    }

    setBusyAction(`delete-stage-${stage.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteWorkflowStage(selectedWorkflow.id, stage.id);
      await refreshAfterMutation("Workflow stage deleted.", selectedWorkflow.id);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <LoadingState label="Loading workflow configuration..." rows={5} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Console"
        title="Workflow Configuration"
        subtitle="Define Medical-Legal-Regulatory review routes for promotional materials."
        status="ACTIVE"
        statusLabel="Configuration Active"
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setFormErrorMessage(null);
              setWorkflowModalState({ mode: "create", workflow: null });
            }}
            className={primaryButtonClass}
          >
            Create Workflow
          </button>
        }
      />

      {(errorMessage || successMessage) && (
        errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => void loadWorkflowConfiguration()} />
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        )
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Workflows" value={workflows.length} helperText="Configured routes" status="info" />
        <KpiCard label="Active Workflows" value={activeWorkflows} helperText="Available for future submission" status="success" />
        <KpiCard
          label="Primary Workflow"
          value={defaultWorkflow?.code ?? "None"}
          helperText={defaultWorkflow?.name ?? "No active primary workflow"}
          status={defaultWorkflow ? "success" : "warning"}
        />
        <KpiCard label="Total Stages" value={totalStages} helperText="Across all workflows" status="neutral" />
      </div>

      <SummaryCard
        title="Primary Workflow"
        subtitle="The active primary workflow is the route used for future review submission."
        action={
          defaultWorkflow && (
            <button
              type="button"
              onClick={() => {
                setSelectedWorkflowId(defaultWorkflow.id);
                setSelectedWorkflowDetail(defaultWorkflow);
              }}
              className={secondaryButtonClass}
            >
              View/Edit
            </button>
          )
        }
      >
        {defaultWorkflow ? (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-950">{defaultWorkflow.name}</h3>
                <StatusBadge status="COMPLETED" label="Primary" />
                <StatusBadge status={defaultWorkflow.is_active ? "ACTIVE" : "INACTIVE"} />
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Code: {defaultWorkflow.code}
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {defaultWorkflow.description || "No description provided."}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-950">
                {defaultWorkflow.stages?.length ?? 0} stages
              </p>
              <p className="mt-1 text-slate-600">
                Updated {formatDateTime(defaultWorkflow.updated_at)}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No primary workflow found"
            description="Create or edit a workflow and mark it as primary."
          />
        )}
      </SummaryCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <SummaryCard
          title="Workflow List"
          subtitle="Review configured MLR routes and select one to manage its stages."
        >
          {workflows.length === 0 ? (
            <EmptyState
              title="No workflows configured"
              description="Create a workflow to define the first MLR review route."
              primaryAction={
                <button
                  type="button"
                  onClick={() => setWorkflowModalState({ mode: "create", workflow: null })}
                  className={primaryButtonClass}
                >
                  Create Workflow
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <WorkflowSummaryCard
                  key={workflow.id}
                  workflow={workflow}
                  isSelected={workflow.id === selectedWorkflowId}
                  onSelect={(workflowToSelect) => void selectWorkflow(workflowToSelect)}
                  onDeactivate={handleDeactivateWorkflow}
                />
              ))}
            </div>
          )}
        </SummaryCard>

        <div className="space-y-6">
          {selectedWorkflow ? (
            <>
              <SummaryCard
                title={selectedWorkflow.name}
                subtitle="Workflow metadata and stage configuration."
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormErrorMessage(null);
                        setWorkflowModalState({ mode: "edit", workflow: selectedWorkflow });
                      }}
                      className={secondaryButtonClass}
                    >
                      Edit Workflow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormErrorMessage(null);
                        setStageModalState({ mode: "create", stage: null });
                      }}
                      className={primaryButtonClass}
                    >
                      Add Stage
                    </button>
                  </div>
                }
              >
                <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailItem label="Code" value={selectedWorkflow.code} />
                  <DetailItem
                    label="Status"
                    value={<StatusBadge status={selectedWorkflow.is_active ? "ACTIVE" : "INACTIVE"} />}
                  />
                  <DetailItem
                    label="Primary"
                    value={
                      <StatusBadge
                        status={selectedWorkflow.is_default ? "COMPLETED" : "PENDING"}
                        label={selectedWorkflow.is_default ? "Yes" : "No"}
                      />
                    }
                  />
                  <DetailItem
                    label="Stages"
                    value={`${selectedWorkflow.stages?.length ?? 0}`}
                  />
                  <DetailItem
                    label="Description"
                    value={selectedWorkflow.description || "No description provided."}
                  />
                  <DetailItem label="Created" value={formatDateTime(selectedWorkflow.created_at)} />
                  <DetailItem label="Updated" value={formatDateTime(selectedWorkflow.updated_at)} />
                </dl>
              </SummaryCard>

              {selectedWorkflow.stages && selectedWorkflow.stages.length > 0 && (
                <WorkflowStepperPreview stages={selectedWorkflow.stages} />
              )}

              <SummaryCard
                title="Workflow Stages"
                subtitle="Stages run in ascending order. Stage order must be unique within the workflow."
                action={
                  busyAction?.startsWith("delete-stage-") && (
                    <span className="text-sm font-medium text-slate-500">Deleting stage...</span>
                  )
                }
              >
                <WorkflowStageList
                  stages={selectedWorkflow.stages ?? []}
                  onEdit={(stage) => {
                    setFormErrorMessage(null);
                    setStageModalState({ mode: "edit", stage });
                  }}
                  onDelete={handleDeleteStage}
                />
              </SummaryCard>
            </>
          ) : (
            <EmptyState
              title="Select a workflow"
              description="Choose a workflow from the list to view metadata and manage stages."
            />
          )}
        </div>
      </div>

      <WorkflowFormModal
        isOpen={workflowModalState !== null}
        mode={workflowModalState?.mode ?? "create"}
        workflow={workflowModalState?.workflow ?? null}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setWorkflowModalState(null);
        }}
        onSubmit={handleSubmitWorkflow}
      />

      <WorkflowStageFormModal
        isOpen={stageModalState !== null}
        mode={stageModalState?.mode ?? "create"}
        stage={stageModalState?.stage ?? null}
        roles={roles.filter((role) => role.is_active)}
        groups={groups.filter((group) => group.is_active)}
        nextStageOrder={nextStageOrder}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setStageModalState(null);
        }}
        onSubmit={handleSubmitStage}
      />
    </PageContainer>
  );

  async function selectWorkflow(workflow: Workflow) {
    setSelectedWorkflowId(workflow.id);
    if (selectedWorkflowDetail?.id === workflow.id && selectedWorkflowDetail.stages) {
      return;
    }

    setErrorMessage(null);
    try {
      setSelectedWorkflowDetail(await getWorkflow(workflow.id));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }
}


type DetailItemProps = {
  label: string;
  value: ReactNode;
};


function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}

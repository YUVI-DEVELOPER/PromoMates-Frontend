import { StatusBadge } from "../ui/StatusBadge";
import type { Workflow } from "../../types/workflow";


type WorkflowSummaryCardProps = {
  workflow: Workflow;
  isSelected: boolean;
  onSelect: (workflow: Workflow) => void;
  onDeactivate: (workflow: Workflow) => void;
};


export function WorkflowSummaryCard({
  workflow,
  isSelected,
  onSelect,
  onDeactivate,
}: WorkflowSummaryCardProps) {
  const stageCount = workflow.stage_count ?? workflow.stages?.length ?? 0;

  return (
    <article
      className={[
        "rounded-lg border bg-white p-5 shadow-sm transition",
        isSelected ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{workflow.name}</h3>
            <StatusBadge status={workflow.is_active ? "ACTIVE" : "INACTIVE"} />
            {workflow.is_default && <StatusBadge status="COMPLETED" label="Primary" />}
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {workflow.code}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {workflow.description || "No description provided."}
          </p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {stageCount} stage{stageCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onSelect(workflow)}
            className="rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            View/Edit
          </button>
          <button
            type="button"
            onClick={() => onDeactivate(workflow)}
            disabled={!workflow.is_active}
            className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deactivate
          </button>
        </div>
      </div>
    </article>
  );
}

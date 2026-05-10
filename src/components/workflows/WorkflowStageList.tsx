import { DataTable, type DataTableColumn } from "../ui/DataTable";
import { StatusBadge } from "../ui/StatusBadge";
import type { WorkflowStage } from "../../types/workflow";


function getStageRoleLabel(stage: WorkflowStage): string {
  return stage.required_role_ref?.name ?? stage.required_role ?? "Unassigned";
}


type WorkflowStageListProps = {
  stages: WorkflowStage[];
  onEdit: (stage: WorkflowStage) => void;
  onDelete: (stage: WorkflowStage) => void;
};


const columns: DataTableColumn<WorkflowStage>[] = [
  {
    header: "Order",
    render: (stage) => (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700">
        {stage.stage_order}
      </span>
    ),
  },
  {
    header: "Stage",
    className: "min-w-56",
    render: (stage) => (
      <div>
        <p className="font-medium text-slate-950">{stage.name}</p>
        <p className="mt-1 text-xs text-slate-500">Stage ID {stage.id}</p>
        {stage.required_group_id && (
          <p className="mt-1 text-xs font-medium text-slate-600">
            Group: {stage.required_group_name ?? `Group ${stage.required_group_id}`}
          </p>
        )}
      </div>
    ),
  },
  {
    header: "Required Role",
    render: (stage) => (
      <StatusBadge status={stage.required_role_id ? "PENDING" : "WARNING"} label={getStageRoleLabel(stage)} />
    ),
  },
  {
    header: "Due Days",
    render: (stage) => (
      <span className="whitespace-nowrap text-slate-700">
        {stage.due_days} day{stage.due_days === 1 ? "" : "s"}
      </span>
    ),
  },
  {
    header: "Required",
    render: (stage) => <StatusBadge status={stage.is_required ? "ACTIVE" : "INACTIVE"} label={stage.is_required ? "Yes" : "No"} />,
  },
  {
    header: "Parallel",
    render: (stage) => <StatusBadge status={stage.allow_parallel ? "WARNING" : "PENDING"} label={stage.allow_parallel ? "Yes" : "No"} />,
  },
];


export function WorkflowStageList({ stages, onEdit, onDelete }: WorkflowStageListProps) {
  const orderedStages = [...stages].sort((first, second) => first.stage_order - second.stage_order);

  return (
    <DataTable
      rows={orderedStages}
      columns={columns}
      getRowKey={(stage) => stage.id}
      emptyTitle="No stages configured"
      emptyDescription="Add the first review stage to define this workflow route."
      renderActions={(stage) => (
        <>
          <button
            type="button"
            onClick={() => onEdit(stage)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(stage)}
            className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100"
          >
            Delete
          </button>
        </>
      )}
    />
  );
}

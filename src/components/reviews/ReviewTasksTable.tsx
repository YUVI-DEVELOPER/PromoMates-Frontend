import { Link } from "react-router-dom";

import type { ReviewTask } from "../../types/review";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { StatusBadge } from "../ui/StatusBadge";


type ReviewTasksTableProps = {
  tasks: ReviewTask[];
  isLoading?: boolean;
  errorMessage?: string | null;
  showDocumentColumn?: boolean;
  canOpenTask?: (task: ReviewTask) => boolean;
};


function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function formatRole(value: string | null): string {
  if (!value) {
    return "Unassigned";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


function getTaskTitle(task: ReviewTask): string {
  return task.document?.title ?? `Document ${task.document_id}`;
}


function getAssigneeLabel(task: ReviewTask): string {
  if (task.assignee?.full_name) {
    return task.assignee.full_name;
  }
  if (task.assignee_id) {
    return `User ${task.assignee_id}`;
  }
  return task.required_group_id
    ? "Unassigned - available to your role and group"
    : "Unassigned - available to your role";
}


export function ReviewTasksTable({
  tasks,
  isLoading = false,
  errorMessage,
  showDocumentColumn = false,
  canOpenTask,
}: ReviewTasksTableProps) {
  if (isLoading) {
    return <LoadingState label="Loading review tasks..." rows={4} />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No review tasks in your queue."
        description="Open My Queue after requests move into MLR review to claim and complete tasks."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">{showDocumentColumn ? "Document / Title" : "Task"}</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Assignee</th>
              <th className="px-4 py-3 font-semibold">Due Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tasks.map((task) => (
              <tr key={task.id} className="align-top transition hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">
                    {task.document?.document_number ?? `Document ${task.document_id}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{getTaskTitle(task)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {task.stage_order}. {task.stage_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {task.required_role_ref?.name ?? formatRole(task.required_role)}
                  </p>
                  {task.required_group_id && (
                    <p className="mt-1 text-xs text-slate-600">
                      {task.required_group_name ?? `Group ${task.required_group_id}`}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {getAssigneeLabel(task)}
                </td>
                <td className="px-4 py-4 text-slate-700">{formatDateTime(task.due_date)}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    {canOpenTask && canOpenTask(task) ? (
                      <Link
                        to={`/tasks/${task.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      >
                        Open Task
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">No action</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {task.document?.document_number ?? `Document ${task.document_id}`}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">{getTaskTitle(task)}</h3>
              </div>
              <StatusBadge status={task.status} />
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <MobileDetail label="Stage" value={`${task.stage_order}. ${task.stage_name}`} />
              <MobileDetail
                label="Required Role"
                value={task.required_role_ref?.name ?? formatRole(task.required_role)}
              />
              <MobileDetail
                label="Required Group"
                value={task.required_group_id ? task.required_group_name ?? `Group ${task.required_group_id}` : "No group scope"}
              />
              <MobileDetail
                label="Assignee"
                value={getAssigneeLabel(task)}
              />
              <MobileDetail label="Due Date" value={formatDateTime(task.due_date)} />
            </dl>

            {canOpenTask && canOpenTask(task) && (
              <div className="mt-4">
                <Link
                  to={`/tasks/${task.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  Open Task
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}


type MobileDetailProps = {
  label: string;
  value: string;
};


function MobileDetail({ label, value }: MobileDetailProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getDesignReviewTasks } from "../../api/designJobs";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { DesignReviewTask } from "../../types/designJob";
import { getApiErrorMessage } from "../../utils/apiError";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function referenceName(value: { name: string; code?: string | null } | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return value.code ? `${value.name} (${value.code})` : value.name;
}

function isOverdue(task: DesignReviewTask): boolean {
  if (!task.due_at) {
    return false;
  }
  const dueTime = new Date(task.due_at).getTime();
  return Number.isFinite(dueTime) && dueTime < Date.now() && task.task_status !== "COMPLETED";
}

export function MyDesignReviews() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DesignReviewTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTasks = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextTasks = await getDesignReviewTasks(signal);
      if (signal?.aborted) {
        return;
      }
      setTasks(nextTasks);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      setTasks([]);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTasks(controller.signal);
    return () => controller.abort();
  }, [loadTasks]);

  const openTasks = useMemo(
    () => tasks.filter((task) => ["OPEN", "IN_PROGRESS"].includes(task.task_status)),
    [tasks],
  );
  const overdueCount = openTasks.filter(isOverdue).length;
  const mandatoryOpenCount = openTasks.reduce((total, task) => total + task.mandatory_comment_count, 0);

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Design Review"
        title="My Design Reviews"
        subtitle="Uploaded design drafts waiting for Therapy Lead review."
        status="OPEN"
        statusLabel="Review Queue"
        metadata={[
          { label: "Visible Tasks", value: tasks.length },
          { label: "Open", value: openTasks.length },
          { label: "Mandatory Comments", value: mandatoryOpenCount },
          { label: "Signed in as", value: user?.full_name ?? "Current user" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open Reviews" value={openTasks.length} helperText="Waiting for your review decision" status="info" />
        <KpiCard label="Mandatory Comments" value={mandatoryOpenCount} helperText="Open mandatory review comments" status={mandatoryOpenCount > 0 ? "warning" : "neutral"} />
        <KpiCard label="Overdue" value={overdueCount} helperText="Review tasks past due date" status={overdueCount > 0 ? "danger" : "success"} />
      </div>

      <SummaryCard title="Therapy Lead Review Queue" subtitle="Open a request to start or continue Therapy Lead design review.">
        {isLoading ? (
          <LoadingState label="Loading design review tasks..." />
        ) : errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p className="font-semibold">Unable to load design review tasks.</p>
            <p className="mt-1 text-xs text-rose-600">{errorMessage}</p>
            <button
              type="button"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              onClick={() => void loadTasks()}
            >
              Retry
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">No design drafts waiting for your review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Draft</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Iteration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Task</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tasks.map((task) => (
                  <tr key={task.task_id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950">{task.request_code ?? "Request"}</div>
                      <div className="mt-1 max-w-[240px] text-slate-600">{task.request_title ?? "Untitled request"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{referenceName(task.product)}</td>
                    <td className="px-4 py-3 text-slate-700">{referenceName(task.country)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{task.design_draft_label ?? "Design draft"}</div>
                      <div className="mt-1">
                        <StatusBadge status={task.design_draft_status ?? "UPLOADED"} label={getStatusLabel(task.design_draft_status ?? "UPLOADED")} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{`${task.current_iteration} of ${task.iteration_limit}`}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>Open: {task.open_comment_count}</div>
                      <div>Mandatory: {task.mandatory_comment_count}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(task.due_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.task_status} label={getStatusLabel(task.task_status)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/requests/${task.request_id}/design`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      >
                        {task.action_label || "Open Design Review"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SummaryCard>
    </PageContainer>
  );
}

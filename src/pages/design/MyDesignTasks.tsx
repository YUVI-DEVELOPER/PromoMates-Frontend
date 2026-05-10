import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getDesignTasks } from "../../api/designJobs";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { DesignTask } from "../../types/designJob";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


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

function isOverdue(task: DesignTask): boolean {
  if (!task.due_at) {
    return false;
  }
  const dueTime = new Date(task.due_at).getTime();
  return Number.isFinite(dueTime) && dueTime < Date.now() && !["COMPLETED", "CANCELLED"].includes(task.status);
}

export function MyDesignTasks() {
  const { hasPermission, user } = useAuth();
  const isDesignerQueueUser = hasPermission(PERMISSIONS.MANAGE_DESIGN) || hasPermission(PERMISSIONS.UPLOAD_DESIGN_DRAFT);
  const isTherapyLeadReviewUser = hasPermission(PERMISSIONS.REVIEW_DESIGN_DRAFT);
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTasks = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextTasks = await getDesignTasks(signal);
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
    () => tasks.filter((task) => ["OPEN", "IN_PROGRESS"].includes(task.task_status ?? task.status)),
    [tasks],
  );
  const overdueCount = openTasks.filter(isOverdue).length;
  const dueThisWeekCount = openTasks.filter((task) => {
    if (!task.due_at) {
      return false;
    }
    const dueTime = new Date(task.due_at).getTime();
    const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return Number.isFinite(dueTime) && dueTime <= oneWeek;
  }).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Design Production"
        title="My Design Tasks"
        subtitle="Submitted design briefs assigned to you or your design group."
        status="OPEN"
        statusLabel="Design Queue"
        metadata={[
          { label: "Visible Tasks", value: tasks.length },
          { label: "Open", value: openTasks.length },
          { label: "Due This Week", value: dueThisWeekCount },
          { label: "Signed in as", value: user?.full_name ?? "Current user" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open Tasks" value={openTasks.length} helperText="Ready for design production" status="info" />
        <KpiCard label="Due This Week" value={dueThisWeekCount} helperText="Open tasks with near due dates" status="neutral" />
        <KpiCard label="Overdue" value={overdueCount} helperText="Open tasks past due date" status={overdueCount > 0 ? "danger" : "success"} />
      </div>

      <SummaryCard title="Design Task Queue" subtitle="Start assigned design production and upload the first design draft from the task context.">
        {isLoading ? (
          <LoadingState label="Loading design tasks..." />
        ) : errorMessage ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
            <p className="font-semibold">Unable to load design tasks.</p>
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
            {isTherapyLeadReviewUser && !isDesignerQueueUser ? (
              <>
                <p className="font-semibold text-slate-800">This page is for Designer production tasks.</p>
                <p className="mt-1">Open My Design Reviews for Therapy Lead review tasks.</p>
                <Link
                  to="/design/reviews"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  Open My Design Reviews
                </Link>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-800">No active design tasks.</p>
                <p className="mt-1">Submitted briefs or uploaded drafts waiting for Therapy Lead review may appear in other tabs.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Brief</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Format</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Design</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Drafts</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tasks.map((task) => (
                  <tr key={task.task_id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950">
                        {task.request_code ?? "Request"}
                      </div>
                      <div className="mt-1 max-w-[240px] text-slate-600">
                        {task.request_title ?? "Untitled request"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {task.design_brief_title ?? "Design brief"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{referenceName(task.product)}</td>
                    <td className="px-4 py-3 text-slate-700">{referenceName(task.country)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {task.design_format ?? referenceName(task.content_type)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(task.due_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.task_status ?? task.status} label={getStatusLabel(task.task_status ?? task.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.design_status ?? task.request_status} label={getStatusLabel(task.design_status ?? task.request_status)} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{task.draft_count ?? task.uploaded_draft_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/requests/${task.request_id}/design`}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      >
                        {task.action_label || "Open Design Context"}
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

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getTasks } from "../api/reviews";
import { ReviewTasksTable } from "../components/reviews/ReviewTasksTable";
import { KpiCard } from "../components/ui/KpiCard";
import { PageContainer } from "../components/ui/PageContainer";
import { PageHeroSummary } from "../components/ui/PageHeroSummary";
import { SummaryCard } from "../components/ui/SummaryCard";
import { useAuth } from "../context/AuthContext";
import { useActiveTabRefreshNonce } from "../context/WorkspaceTabsContext";
import type { ReviewTask, ReviewTaskStatus } from "../types/review";
import { getApiErrorMessage } from "../utils/apiError";


type TaskView = "assigned" | "available" | "in_progress" | "completed" | "all";


const taskViews: Array<{ id: TaskView; label: string }> = [
  { id: "assigned", label: "My Queue" },
  { id: "available", label: "Available" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All visible tasks" },
];


const taskStatusOptions: ReviewTaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
  "SKIPPED",
];


const completedStatuses = new Set<ReviewTaskStatus>([
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
  "SKIPPED",
]);


function formatOption(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


function getViewStatus(view: TaskView): ReviewTaskStatus | undefined {
  if (view === "available") {
    return "PENDING";
  }

  if (view === "in_progress") {
    return "IN_PROGRESS";
  }

  return undefined;
}


export function MyTasks() {
  const { isSuperuser, user } = useAuth();
  const [searchParams] = useSearchParams();
  const refreshNonce = useActiveTabRefreshNonce();
  const [activeView, setActiveView] = useState<TaskView>("assigned");
  const [statusFilter, setStatusFilter] = useState<ReviewTaskStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const visibleTaskViews = useMemo(
    () => (isSuperuser ? taskViews : taskViews.filter((view) => view.id !== "all")),
    [isSuperuser],
  );

  useEffect(() => {
    const queryView = searchParams.get("view") as TaskView | null;
    const nextView =
      queryView && visibleTaskViews.some((view) => view.id === queryView)
        ? queryView
        : visibleTaskViews.some((view) => view.id === activeView)
          ? activeView
          : "assigned";

    if (nextView !== activeView) {
      setActiveView(nextView);
    }
  }, [activeView, searchParams, visibleTaskViews]);

  useEffect(() => {
    let isMounted = true;

    async function loadTasks(background = false) {
      if (!background) {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const response = await getTasks({
          assigned_to_me:
            activeView === "all" || activeView === "available"
              ? false
              : true,
          status: statusFilter || getViewStatus(activeView),
          required_role_id: roleFilter ? Number(roleFilter) : undefined,
          page: 1,
          page_size: 100,
        });

        if (isMounted) {
          setTasks(response.items);
          setTotal(response.total);
        }
      } catch (error) {
        if (isMounted) {
          setTasks([]);
          setTotal(0);
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks(false);

    return () => {
      isMounted = false;
    };
  }, [activeView, isSuperuser, roleFilter, statusFilter]);

  useEffect(() => {
    if (refreshNonce <= 0) {
      return;
    }

    let isMounted = true;

    async function refreshTasks() {
      setErrorMessage(null);
      try {
        const response = await getTasks({
          assigned_to_me:
            activeView === "all" || activeView === "available"
              ? false
              : true,
          status: statusFilter || getViewStatus(activeView),
          required_role_id: roleFilter ? Number(roleFilter) : undefined,
          page: 1,
          page_size: 100,
        });

        if (isMounted) {
          setTasks(response.items);
          setTotal(response.total);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      }
    }

    void refreshTasks();

    return () => {
      isMounted = false;
    };
  }, [refreshNonce]);

  const visibleTasks = useMemo(() => {
    if (activeView === "completed" && !statusFilter) {
      return tasks.filter((task) => completedStatuses.has(task.status));
    }

    return tasks;
  }, [activeView, statusFilter, tasks]);

  const pendingCount = visibleTasks.filter((task) => task.status === "PENDING").length;
  const inProgressCount = visibleTasks.filter((task) => task.status === "IN_PROGRESS").length;
  const completedCount = visibleTasks.filter((task) => completedStatuses.has(task.status)).length;
  const overdueCount = visibleTasks.filter((task) => {
    const dueTime = new Date(task.due_date).getTime();
    return Number.isFinite(dueTime) && dueTime < Date.now() && !completedStatuses.has(task.status);
  }).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Review Queue"
        title="My Queue"
        subtitle="Assigned MLR review tasks with clear due dates and decision actions."
        status="IN_PROGRESS"
        statusLabel="Task Dashboard"
        metadata={[
          { label: "Visible Tasks", value: total },
          { label: "Mode", value: isSuperuser && activeView === "all" ? "Superuser view" : "Queue focus" },
          { label: "Signed in as", value: user?.full_name ?? "Current user" },
          { label: "Open Tasks", value: pendingCount + inProgressCount },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending" value={pendingCount} helperText="Awaiting reviewer action" status="neutral" />
        <KpiCard label="In Progress" value={inProgressCount} helperText="Currently being reviewed" status="info" />
        <KpiCard label="Completed" value={completedCount} helperText="Decision recorded" status="success" />
        <KpiCard label="Overdue" value={overdueCount} helperText="Open tasks past due date" status="danger" />
      </div>

      <SummaryCard
        title="Task Filters"
        subtitle="Filter your queue by status and required role."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {visibleTaskViews.map((view) => {
              const isActive = activeView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={[
                    "rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-100",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {view.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ReviewTaskStatus | "")}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Use selected queue tab</option>
                {taskStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatOption(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Required Role</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All roles</option>
                {(user?.roles ?? []).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </SummaryCard>

      <ReviewTasksTable
        tasks={visibleTasks}
        isLoading={isLoading}
        errorMessage={errorMessage}
        showDocumentColumn
        canOpenTask={() => true}
      />
    </PageContainer>
  );
}

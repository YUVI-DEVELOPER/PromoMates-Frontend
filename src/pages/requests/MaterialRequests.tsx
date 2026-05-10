import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getMaterialRequests, getMedicalReviewTasks, getTherapyLeadTasks } from "../../api/materialRequests";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useActiveTabRefreshNonce } from "../../context/WorkspaceTabsContext";
import { useMaterialRequestMasterData } from "../../hooks/useMaterialRequestMasterData";
import type {
  MaterialRequest,
  MaterialRequestListParams,
  MaterialRequestStatus,
  MedicalReviewTask,
  TherapyLeadTask,
} from "../../types/materialRequest";
import { getApiErrorMessage } from "../../utils/apiError";
import { canCreateRequests } from "../../utils/access";


type Filters = {
  search: string;
  status: string;
  regionId: string;
  productId: string;
  therapeuticAreaId: string;
  myGroupsOnly: boolean;
};


const initialFilters: Filters = {
  search: "",
  status: "",
  regionId: "",
  productId: "",
  therapeuticAreaId: "",
  myGroupsOnly: false,
};


const requestStatuses: MaterialRequestStatus[] = [
  "DRAFT",
  "SUBMITTED_PENDING_REGIONAL_REVIEW",
  "UNDER_REGIONAL_REVIEW",
  "RETURNED_TO_SPOC",
  "SPOC_REVISION_IN_PROGRESS",
  "RESUBMITTED",
  "RESUBMITTED_PENDING_REGIONAL_REVIEW",
  "APPROVED_ASSIGNED_TO_THERAPY_LEAD",
  "DRAFT_IN_PROGRESS",
  "DRAFT_VERSION_READY",
  "SUBMITTED_FOR_MEDICAL_REVIEW",
  "MEDICAL_REVIEW_IN_PROGRESS",
  "MEDICAL_REVISION_REQUIRED",
  "MEDICAL_REVISION_IN_PROGRESS",
  "RESUBMITTED_FOR_MEDICAL_REVIEW",
  "MEDICAL_CONTENT_APPROVED",
  "DESIGN_BRIEF_IN_PROGRESS",
  "DESIGN_BRIEF_SUBMITTED",
  "DESIGN_IN_PROGRESS",
  "DESIGN_DRAFT_UPLOADED",
  "DESIGN_REVIEW_IN_PROGRESS",
  "DESIGN_APPROVED",
  "DESIGN_REVISION_REQUIRED",
  "DESIGN_REVISION_IN_PROGRESS",
  "DEFERRED",
  "MERGED",
  "REJECTED",
  "CLOSED",
];


const pageSize = 20;
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100";


function toNumber(value: string): number | undefined {
  return value ? Number(value) : undefined;
}


function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}


function fallbackName(name: string | undefined | null, id: number | null): string {
  if (name) {
    return name;
  }

  return id ? `ID ${id}` : "Not set";
}


function getNextRoleLabel(status: MaterialRequestStatus): string {
  const nextRoleMap: Record<MaterialRequestStatus, string> = {
    DRAFT: "Requester",
    SUBMITTED: "Regional Marketing",
    SUBMITTED_PENDING_REGIONAL_REVIEW: "Regional Marketing",
    UNDER_REGIONAL_REVIEW: "Regional Marketing",
    RETURNED_TO_SPOC: "Country SPOC",
    SPOC_REVISION_IN_PROGRESS: "Country SPOC",
    RESUBMITTED: "Regional Marketing",
    RESUBMITTED_PENDING_REGIONAL_REVIEW: "Regional Marketing",
    APPROVED_ASSIGNED_TO_THERAPY_LEAD: "Therapy Lead",
    DRAFT_IN_PROGRESS: "Therapy Lead",
    DRAFT_VERSION_READY: "Therapy Lead",
    SUBMITTED_FOR_MEDICAL_REVIEW: "Medical Reviewer",
    MEDICAL_REVIEW_IN_PROGRESS: "Medical Reviewer",
    MEDICAL_REVISION_REQUIRED: "Therapy Lead",
    MEDICAL_REVISION_IN_PROGRESS: "Therapy Lead",
    RESUBMITTED_FOR_MEDICAL_REVIEW: "Medical Reviewer",
    MEDICAL_CONTENT_APPROVED: "Therapy Lead",
    DESIGN_BRIEF_IN_PROGRESS: "Therapy Lead",
    DESIGN_BRIEF_SUBMITTED: "Design",
    DEFERRED: "Regional Marketing",
    MERGED: "Closed",
    CLOSED: "Closed",
    THERAPY_REVIEW: "Therapy Lead",
    THERAPY_CHANGES_REQUESTED: "Requester",
    MARKETING_REVIEW: "Marketing Manager",
    MARKETING_CHANGES_REQUESTED: "Requester",
    READY_FOR_MLR: "Request Creator",
    MLR_IN_REVIEW: "Medical / Legal / Regulatory Reviewer",
    MLR_CHANGES_REQUESTED: "Request Creator",
    MLR_APPROVED: "Compliance",
    DESIGN_IN_PROGRESS: "Design",
    DESIGN_DRAFT_UPLOADED: "Therapy Lead",
    DESIGN_REVIEW_IN_PROGRESS: "Therapy Lead",
    DESIGN_APPROVED: "Proof Reader",
    DESIGN_REVISION_REQUIRED: "Design",
    DESIGN_REVISION_IN_PROGRESS: "Design",
    DESIGN_REVIEW: "Design Approver",
    FINAL_APPROVAL: "Final Approver",
    FINAL_APPROVED: "Publisher",
    DISTRIBUTED: "Sales",
    REJECTED: "Closed",
    WITHDRAWN: "Closed",
    EXPIRED: "Closed",
  };

  return nextRoleMap[status] ?? "Review status";
}


export function MaterialRequests() {
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const refreshNonce = useActiveTabRefreshNonce();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [therapyTasks, setTherapyTasks] = useState<TherapyLeadTask[]>([]);
  const [medicalReviewTasks, setMedicalReviewTasks] = useState<MedicalReviewTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const masterData = useMaterialRequestMasterData();
  const canCreateRequest = canCreateRequests(hasPermission);
  const rawViewParam = searchParams.get("view") ?? "";
  const viewParam = rawViewParam === "therapy-tasks" || rawViewParam === "medical-review-tasks" ? "mine" : rawViewParam;
  const isAssignedRequestsView = searchParams.get("assigned_to_me") === "true";
  const isMyRequestsView = viewParam === "mine" || isAssignedRequestsView;
  const isTherapyTaskView = false;
  const isMedicalReviewTaskView = false;

  const fetchRequests = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    if (isTherapyTaskView) {
      try {
        const tasks = await getTherapyLeadTasks();
        setTherapyTasks(tasks);
        setMedicalReviewTasks([]);
        setRequests([]);
        setTotal(tasks.length);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isMedicalReviewTaskView) {
      try {
        const tasks = await getMedicalReviewTasks();
        setMedicalReviewTasks(tasks);
        setTherapyTasks([]);
        setRequests([]);
        setTotal(tasks.length);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const isDraftFilter = filters.status === "DRAFT";
    const params: MaterialRequestListParams = {
      search: filters.search.trim() || undefined,
      status: filters.status ? (filters.status as MaterialRequestStatus) : undefined,
      requested_by_me: isDraftFilter ? true : undefined,
      my_requests: isMyRequestsView ? true : undefined,
      pending_regional_review: viewParam === "regional-review" ? true : undefined,
      returned_to_me: viewParam === "returned" ? true : undefined,
      active: viewParam === "in-review" || isDraftFilter ? true : undefined,
      region_id: toNumber(filters.regionId),
      product_id: toNumber(filters.productId),
      therapeutic_area_id: toNumber(filters.therapeuticAreaId),
      my_groups_only: filters.myGroupsOnly ? true : undefined,
      page,
      page_size: pageSize,
    };

    try {
      const response = await getMaterialRequests(params);
      setRequests(response.items);
      setTherapyTasks([]);
      setMedicalReviewTasks([]);
      setTotal(response.total);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [filters, isMedicalReviewTaskView, isMyRequestsView, isTherapyTaskView, page, viewParam]);

  useEffect(() => {
    const statusParam = searchParams.get("status") ?? "";
    setFilters((currentFilters) => {
      if (currentFilters.status === statusParam) {
        return currentFilters;
      }
      return {
        ...currentFilters,
        status: statusParam,
      };
    });
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    void fetchRequests(false);
  }, [fetchRequests]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void fetchRequests(true);
    }
  }, [refreshNonce]);

  function updateFilter<FieldName extends keyof Filters>(fieldName: FieldName, value: Filters[FieldName]) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [fieldName]: value,
    }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  const draftCount = requests.filter((request) => request.status === "DRAFT").length;
  const reviewCount = requests.filter((request) =>
    ["SUBMITTED_PENDING_REGIONAL_REVIEW", "UNDER_REGIONAL_REVIEW", "RESUBMITTED", "RESUBMITTED_PENDING_REGIONAL_REVIEW"].includes(request.status),
  ).length;
  const routedCount = requests.filter((request) => request.status === "APPROVED_ASSIGNED_TO_THERAPY_LEAD").length;
  const draftInProgressCount = requests.filter((request) => request.status === "DRAFT_IN_PROGRESS").length;
  const openTherapyTaskCount = therapyTasks.filter((task) => task.status === "OPEN").length;
  const inProgressTherapyTaskCount = therapyTasks.filter((task) => task.status === "IN_PROGRESS").length;
  const openMedicalTaskCount = medicalReviewTasks.filter((task) => task.status === "OPEN").length;
  const inProgressMedicalTaskCount = medicalReviewTasks.filter((task) => task.status === "IN_PROGRESS").length;
  const isTaskView = isTherapyTaskView || isMedicalReviewTaskView;
  const pageTitle = isMedicalReviewTaskView
    ? "My Requests"
    : isTherapyTaskView
      ? "My Requests"
      : isMyRequestsView
        ? "My Requests"
        : "Content Requests";
  const pageSubtitle = isMedicalReviewTaskView
    ? "Requests you created or that are assigned to you."
    : isTherapyTaskView
      ? "Requests you created or that are assigned to you."
      : isMyRequestsView
        ? "Requests you created or that are assigned to you."
        : "Track content requests from intake through review and production.";

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Requests"
        title={pageTitle}
        subtitle={pageSubtitle}
        status="ACTIVE"
        statusLabel={isMedicalReviewTaskView ? "Medical Review" : isTherapyTaskView ? "Therapy Lead" : isMyRequestsView ? "My Work" : "Requests"}
        metadata={[
          { label: isTaskView ? "Assigned Tasks" : "Matching Requests", value: total },
          {
            label: isTaskView ? "Open Tasks" : "Open On Page",
            value: isMedicalReviewTaskView
              ? openMedicalTaskCount
              : isTherapyTaskView
                ? openTherapyTaskCount
              : requests.filter((request) => !["REJECTED", "WITHDRAWN", "EXPIRED"].includes(request.status)).length,
          },
        ]}
        primaryAction={
          canCreateRequest ? (
            <Link to="/requests/create" className={primaryButtonClass}>
              New Content Request
            </Link>
          ) : undefined
        }
      />

      {(errorMessage || masterData.errorMessage) && (
        <ErrorState message={errorMessage || masterData.errorMessage || "Unable to load content requests."} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isMedicalReviewTaskView ? (
          <>
            <KpiCard label="Total" value={total} helperText="Assigned review tasks" status="info" />
            <KpiCard label="Open" value={openMedicalTaskCount} helperText="Waiting for review" status="neutral" />
            <KpiCard label="In Progress" value={inProgressMedicalTaskCount} helperText="Review started" status="warning" />
            <KpiCard label="Next Step" value={openMedicalTaskCount + inProgressMedicalTaskCount} helperText="Open request context" status="success" />
          </>
        ) : isTherapyTaskView ? (
          <>
            <KpiCard label="Total" value={total} helperText="Assigned draft tasks" status="info" />
            <KpiCard label="Open" value={openTherapyTaskCount} helperText="Waiting to start" status="neutral" />
            <KpiCard label="In Progress" value={inProgressTherapyTaskCount} helperText="Therapy work started" status="warning" />
            <KpiCard label="Next Step" value={inProgressTherapyTaskCount} helperText="Continue assigned work" status="success" />
          </>
        ) : (
          <>
            <KpiCard label="Total" value={total} helperText="Matching current filters" status="info" />
            <KpiCard label="Draft" value={draftCount} helperText="Draft records on this page" status="neutral" />
            <KpiCard label="Regional Review" value={reviewCount} helperText="Pending or under evaluation" status="warning" />
            <KpiCard label="Therapy Drafting" value={routedCount + draftInProgressCount} helperText="Assigned or in progress" status="success" />
          </>
        )}
      </div>

      {!isTaskView && (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto_auto] lg:items-end">
          <FilterText
            id="request-search"
            label="Search"
            value={filters.search}
            placeholder="Search request code, title, objective..."
            onChange={(value) => updateFilter("search", value)}
          />
          <FilterSelect
            id="request-status-filter"
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
          >
            <option value="">All statuses</option>
            {requestStatuses.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="request-region-filter"
            label="Region"
            value={filters.regionId}
            onChange={(value) => updateFilter("regionId", value)}
          >
            <option value="">All regions</option>
            {masterData.regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="request-product-filter"
            label="Product"
            value={filters.productId}
            onChange={(value) => updateFilter("productId", value)}
          >
            <option value="">All products</option>
            {masterData.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="request-ta-filter"
            label="Therapy Area"
            value={filters.therapeuticAreaId}
            onChange={(value) => updateFilter("therapeuticAreaId", value)}
          >
            <option value="">All areas</option>
            {masterData.therapeuticAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </FilterSelect>
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </button>
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={filters.myGroupsOnly}
              onChange={(event) => updateFilter("myGroupsOnly", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            My groups
          </label>
        </div>
      </section>
      )}

      {isMedicalReviewTaskView ? (
        <MedicalReviewTaskResults tasks={medicalReviewTasks} isLoading={isLoading} />
      ) : isTherapyTaskView ? (
        <TherapyTaskResults tasks={therapyTasks} isLoading={isLoading} />
      ) : (
        <RequestResults
          requests={requests}
          canCreateRequest={canCreateRequest}
          isLoading={isLoading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </PageContainer>
  );
}


type RequestResultsProps = {
  requests: MaterialRequest[];
  canCreateRequest: boolean;
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};


type TherapyTaskResultsProps = {
  tasks: TherapyLeadTask[];
  isLoading: boolean;
};


type MedicalReviewTaskResultsProps = {
  tasks: MedicalReviewTask[];
  isLoading: boolean;
};


function referenceName(reference: { name: string } | null | undefined): string {
  return reference?.name ?? "Not set";
}


function therapyTaskTypeLabel(task: TherapyLeadTask): string {
  if (task.task_type === "THERAPY_MEDICAL_REVISION") {
    return "Medical Revision";
  }
  return "Draft Creation";
}


function therapyTaskActionLabel(task: TherapyLeadTask): string {
  return task.action_label ?? (task.task_type === "THERAPY_MEDICAL_REVISION" && task.status === "OPEN"
    ? "Start Revision"
    : task.task_type === "THERAPY_MEDICAL_REVISION"
      ? "Continue Revision"
      : "Open");
}


function TherapyTaskResults({ tasks, isLoading }: TherapyTaskResultsProps) {
  if (isLoading) {
    return <LoadingState label="Loading Therapy Lead tasks..." rows={4} />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No Therapy Lead tasks found"
        description="Approved requests assigned to you for draft creation will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Task / Request</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Market</th>
              <th className="px-4 py-3 font-semibold">Product / Therapy</th>
              <th className="px-4 py-3 font-semibold">Feedback</th>
              <th className="px-4 py-3 font-semibold">Due / Market</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tasks.map((task) => (
              <tr key={task.task_id} className="align-top transition hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {therapyTaskTypeLabel(task)}
                  </p>
                  <Link
                    to={`/requests/${task.request_id}`}
                    className="mt-1 block font-medium text-slate-950 hover:text-brand-700"
                  >
                    {task.request_code ?? "Draft"} / {task.request_title ?? "Untitled content request"}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{task.current_action}</p>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <StatusBadge status={task.status} />
                    <StatusBadge status={task.request_status} />
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">{referenceName(task.country)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{referenceName(task.region)}</span>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">{referenceName(task.product)}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {referenceName(task.therapy_area)} / {referenceName(task.sub_therapy)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {task.task_type === "THERAPY_MEDICAL_REVISION" ? (
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status="WARNING" label={`${task.open_mandatory_comment_count ?? 0} mandatory`} />
                      <StatusBadge status="WARNING" label={`${task.reference_issue_count ?? 0} refs`} />
                    </div>
                  ) : (
                    <span className="text-slate-500">Not applicable</span>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">{formatDate(task.due_at)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{formatDate(task.in_market_date)}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <Link
                      to={`/requests/${task.request_id}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {therapyTaskActionLabel(task)}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {tasks.map((task) => (
          <Link
            key={task.task_id}
            to={`/requests/${task.request_id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-brand-50/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {therapyTaskTypeLabel(task)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">
                  {task.request_code ?? "Draft"} / {task.request_title ?? "Untitled content request"}
                </h3>
              </div>
              <StatusBadge status={task.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <MobileDetail label="Product" value={referenceName(task.product)} />
              <MobileDetail label="Country" value={referenceName(task.country)} />
              <MobileDetail label="Therapy" value={referenceName(task.therapy_area)} />
              <MobileDetail label="Next Action" value={therapyTaskActionLabel(task)} />
              {task.task_type === "THERAPY_MEDICAL_REVISION" && (
                <MobileDetail
                  label="Medical Feedback"
                  value={`${task.open_mandatory_comment_count ?? 0} mandatory / ${task.reference_issue_count ?? 0} reference issues`}
                />
              )}
              <MobileDetail label="Due Date" value={formatDate(task.due_at)} />
              <MobileDetail label="In-Market Date" value={formatDate(task.in_market_date)} />
            </dl>
          </Link>
        ))}
      </div>
    </div>
  );
}


function draftVersionLabel(task: MedicalReviewTask): string {
  const draft = task.draft_version;
  if (!draft) {
    return task.content_version_id ?? "Not set";
  }
  const versionNumber = draft.version_number ? `V${draft.version_number}` : "Draft";
  return draft.version_label ? `${versionNumber} / ${draft.version_label}` : versionNumber;
}


function medicalTaskTypeLabel(task: MedicalReviewTask): string {
  return task.request_status === "RESUBMITTED_FOR_MEDICAL_REVIEW" ? "Resubmitted Review" : "Medical Review";
}


function MedicalReviewTaskResults({ tasks, isLoading }: MedicalReviewTaskResultsProps) {
  if (isLoading) {
    return <LoadingState label="Loading Medical Review tasks..." rows={4} />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No Medical Review tasks found"
        description="Submitted draft versions assigned to you or your review group will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Task / Request</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Dashboard / Draft</th>
              <th className="px-4 py-3 font-semibold">Product / Therapy</th>
              <th className="px-4 py-3 font-semibold">Market</th>
              <th className="px-4 py-3 font-semibold">Due / Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {tasks.map((task) => (
              <tr key={task.task_id} className="align-top transition hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {medicalTaskTypeLabel(task)}
                  </p>
                  <Link
                    to={`/requests/${task.request_id}/medical-review`}
                    className="mt-1 block font-medium text-slate-950 hover:text-brand-700"
                  >
                    {task.request_code ?? "Request"} / {task.request_title ?? "Untitled content request"}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{task.action}</p>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <StatusBadge status={task.status} />
                    <StatusBadge status={task.request_status} />
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">
                    {task.content_workspace_code ?? "Dashboard not set"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{draftVersionLabel(task)}</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {task.status === "IN_PROGRESS" && (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        In Progress
                      </span>
                    )}
                    {(task.open_mandatory_comment_count ?? 0) > 0 && (
                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {task.open_mandatory_comment_count} open mandatory
                      </span>
                    )}
                    {(task.reference_issue_count ?? 0) > 0 && (
                      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        {task.reference_issue_count} reference issues
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">{referenceName(task.product)}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {referenceName(task.therapy_area)} / {referenceName(task.sub_therapy)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">{referenceName(task.country)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{referenceName(task.region)}</span>
                </td>
                <td className="px-4 py-4 text-slate-600">{formatDate(task.due_at)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      to={`/requests/${task.request_id}/medical-review`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Open
                    </Link>
                    <Link
                      to={`/requests/${task.request_id}/medical-review`}
                      className="rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
                    >
                      {task.action}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {tasks.map((task) => (
          <Link
            key={task.task_id}
            to={`/requests/${task.request_id}/medical-review`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-brand-50/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {medicalTaskTypeLabel(task)}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">
                  {task.request_code ?? "Request"} / {task.request_title ?? "Untitled content request"}
                </h3>
              </div>
              <StatusBadge status={task.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <MobileDetail label="Dashboard" value={task.content_workspace_code ?? "Not set"} />
              <MobileDetail label="Draft Version" value={draftVersionLabel(task)} />
              <MobileDetail label="Open Mandatory Comments" value={`${task.open_mandatory_comment_count ?? 0}`} />
              <MobileDetail label="Reference Issues" value={`${task.reference_issue_count ?? 0}`} />
              <MobileDetail label="Product" value={referenceName(task.product)} />
              <MobileDetail label="Country" value={referenceName(task.country)} />
              <MobileDetail label="Therapy" value={referenceName(task.therapy_area)} />
              <MobileDetail label="Due Date" value={formatDate(task.due_at)} />
              <MobileDetail label="Action" value={task.action} />
            </dl>
          </Link>
        ))}
      </div>
    </div>
  );
}


function RequestResults({
  requests,
  canCreateRequest,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: RequestResultsProps) {
  if (isLoading) {
    return <LoadingState label="Loading content requests..." rows={4} />;
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No content requests found"
        description={
          canCreateRequest
            ? "Create a request or adjust your filters."
            : "No requests are visible for your current filters."
        }
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(total, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Number / Title</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Owner / Next Role</th>
              <th className="px-4 py-3 font-semibold">Due Date</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {requests.map((request) => (
              <tr key={request.id} className="align-top transition hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <Link
                    to={`/requests/${request.id}`}
                    className="font-medium text-slate-950 hover:text-brand-700"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {request.request_number ?? "Draft"}
                    </span>
                    <span className="mt-1 block">{request.title ?? "Untitled content request"}</span>
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {fallbackName(request.product?.name, request.product_id)}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <span className="block font-medium text-slate-900">
                    {request.requested_by?.full_name ?? "Requester"}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Next: {getNextRoleLabel(request.status)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {request.status === "DRAFT" ? formatDate(request.updated_at) : formatDate(request.required_by_date)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <Link
                      to={request.status === "DRAFT" ? `/requests/${request.id}/edit` : `/requests/${request.id}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {request.status === "DRAFT" ? "Continue" : "View"}
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {requests.map((request) => (
          <Link
            key={request.id}
            to={request.status === "DRAFT" ? `/requests/${request.id}/edit` : `/requests/${request.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-brand-50/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {request.request_number ?? "Draft"}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">{request.title ?? "Untitled content request"}</h3>
              </div>
              <StatusBadge status={request.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <MobileDetail label="Product" value={fallbackName(request.product?.name, request.product_id)} />
              <MobileDetail label="Region" value={fallbackName(request.region?.name, request.region_id)} />
              <MobileDetail label="Owner" value={request.requested_by?.full_name ?? `User ${request.requested_by_id}`} />
              <MobileDetail label="Next Role" value={getNextRoleLabel(request.status)} />
              <MobileDetail
                label={request.status === "DRAFT" ? "Last Updated" : "Due Date"}
                value={request.status === "DRAFT" ? formatDate(request.updated_at) : formatDate(request.required_by_date)}
              />
            </dl>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {firstItem}-{lastItem} of {total}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


type FilterTextProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};


function FilterText({ id, label, value, placeholder, onChange }: FilterTextProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}


type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
};


function FilterSelect({ id, label, value, children, onChange }: FilterSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}

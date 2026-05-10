import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { getApprovedMaterials } from "../api/approvedMaterials";
import { getDistributionPackages, getSalesRepMaterials } from "../api/distribution";
import { getDocuments } from "../api/documents";
import {
  getMaterialRequests,
  getMaterialRequestStatusCounts,
  getMedicalReviewTasks,
  getTherapyLeadTasks,
} from "../api/materialRequests";
import { getTasks } from "../api/reviews";
import { getSetupChecklist } from "../api/setup";
import { getRoles, getUsers } from "../api/users";
import { ErrorState } from "../components/ui/ErrorState";
import { KpiCard } from "../components/ui/KpiCard";
import { LoadingState } from "../components/ui/LoadingState";
import { PageContainer } from "../components/ui/PageContainer";
import { PageHeroSummary } from "../components/ui/PageHeroSummary";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SummaryCard } from "../components/ui/SummaryCard";
import { useAuth } from "../context/AuthContext";
import type { ApprovedMaterial } from "../types/approvedMaterial";
import type { User } from "../types/auth";
import type { DistributionPackage, PackageMaterial } from "../types/distribution";
import type { DocumentListItem } from "../types/document";
import type {
  MaterialRequest,
  MaterialRequestStatus,
  MedicalReviewTask,
  TherapyLeadTask,
} from "../types/materialRequest";
import type { ReviewTask } from "../types/review";
import {
  canAccessAdmin,
  canAccessApprovedMaterials,
  canAccessDistribution,
  canAccessDocumentLibrary,
  canAccessReviewTasks,
  canAccessSalesMaterials,
  canCreateRequests,
  type PermissionChecker,
} from "../utils/access";
import { getApiErrorMessage } from "../utils/apiError";
import { PERMISSIONS } from "../utils/permissions";


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";

const smallLinkClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";

const inlineOpenClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700";

const completedReviewStatuses = new Set(["APPROVED", "CHANGES_REQUESTED", "REJECTED", "SKIPPED"]);

const trackedRequestStatuses: MaterialRequestStatus[] = [
  "DRAFT",
  "SUBMITTED",
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
  "THERAPY_REVIEW",
  "THERAPY_CHANGES_REQUESTED",
  "READY_FOR_MLR",
  "MLR_IN_REVIEW",
  "MLR_CHANGES_REQUESTED",
  "MLR_APPROVED",
  "DESIGN_IN_PROGRESS",
  "DESIGN_DRAFT_UPLOADED",
  "DESIGN_REVIEW",
  "FINAL_APPROVAL",
  "FINAL_APPROVED",
  "DISTRIBUTED",
];


type KpiStatus = "neutral" | "success" | "warning" | "danger" | "info";

type WorkspaceMode =
  | "system"
  | "requester"
  | "regional"
  | "therapy"
  | "medical"
  | "design"
  | "approval"
  | "distribution"
  | "sales"
  | "none";

type DashboardAction = {
  label: string;
  path: string;
  primary?: boolean;
};

type DashboardMetric = {
  id: string;
  label: string;
  value: ReactNode;
  helperText: ReactNode;
  status: KpiStatus;
  path?: string;
};

type QuickAction = {
  label: string;
  path: string;
  detail: string;
};

type WorkItem = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  path: string;
  reference?: string | null;
  status?: string | null;
  dueAt?: string | null;
  sortDate?: string | null;
  weight: number;
};

type RequestStatusCounts = Partial<Record<MaterialRequestStatus, number>>;

type RequestDashboard = {
  total: number;
  myTotal: number;
  draftTotal: number;
  returnedTotal: number;
  regionalTotal: number;
  submittedRegionalTotal: number;
  underRegionalTotal: number;
  approvedRoutedTotal: number;
  therapyTotal: number;
  designTotal: number;
  complianceTotal: number;
  finalApprovalTotal: number;
  medicalCopyTotal: number;
  medicalRevisionTotal: number;
  medicalApprovedTotal: number;
  designBriefTotal: number;
  designBriefSubmittedTotal: number;
  proofReadingTotal: number;
  mlrReviewTotal: number;
  finalApprovedTotal: number;
  distributedTotal: number;
  statusTotals: RequestStatusCounts;
  recentItems: MaterialRequest[];
};

type TherapyTaskDashboard = {
  total: number;
  open: number;
  inProgress: number;
  needsAttention: number;
  revisionTotal: number;
  overdue: number;
  items: TherapyLeadTask[];
};

type MedicalTaskDashboard = {
  total: number;
  open: number;
  inProgress: number;
  needsAttention: number;
  overdue: number;
  items: MedicalReviewTask[];
};

type ReviewTaskDashboard = {
  total: number;
  open: number;
  inProgress: number;
  overdue: number;
  items: ReviewTask[];
};

type DocumentDashboard = {
  total: number;
  ready: number;
  inReview: number;
  approved: number;
  items: DocumentListItem[];
};

type ApprovedMaterialDashboard = {
  total: number;
  active: number;
  expiringSoon: number;
  items: ApprovedMaterial[];
};

type DistributionDashboard = {
  total: number;
  released: number;
  scheduled: number;
  availableNow: number;
  items: DistributionPackage[];
};

type SalesDashboard = {
  available: number;
  packages: number;
  expiringSoon: number;
  items: PackageMaterial[];
};

type AdminDashboard = {
  users: number;
  roles: number;
  setupComplete: number;
  setupTotal: number;
  requiredMissing: number;
  nextSetupAction: QuickAction | null;
};

type DashboardData = {
  requests?: RequestDashboard;
  therapyTasks?: TherapyTaskDashboard;
  medicalTasks?: MedicalTaskDashboard;
  reviewTasks?: ReviewTaskDashboard;
  documents?: DocumentDashboard;
  approvedMaterials?: ApprovedMaterialDashboard;
  distribution?: DistributionDashboard;
  sales?: SalesDashboard;
  admin?: AdminDashboard;
  errors: string[];
};

type LifecycleStage = {
  label: string;
  value: number;
};


function createEmptyDashboardData(): DashboardData {
  return { errors: [] };
}


function renderAction(action: DashboardAction | null | undefined) {
  if (!action) {
    return undefined;
  }

  return (
    <Link
      to={action.path}
      className={action.primary ? primaryButtonClass : secondaryButtonClass}
    >
      {action.label}
    </Link>
  );
}


export function Dashboard() {
  const { hasPermission, user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData>(() => createEmptyDashboardData());
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const workspaceMode = useMemo(() => getWorkspaceMode(hasPermission, user), [hasPermission, user]);
  const workspaceLabel = getWorkspaceLabel(workspaceMode);
  const heroActions = getHeroActions(workspaceMode, hasPermission);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      const nextDashboard = await fetchDashboardData(hasPermission);

      if (isMounted) {
        setDashboard(nextDashboard);
        setIsLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [hasPermission, reloadToken]);

  const workMetrics = useMemo(
    () => buildMyWorkMetrics(dashboard, workspaceMode, hasPermission),
    [dashboard, hasPermission, workspaceMode],
  );
  const operationalQueue = useMemo(
    () => buildOperationalQueue(dashboard, workspaceMode, hasPermission),
    [dashboard, hasPermission, workspaceMode],
  );
  const priorityWork = useMemo(() => buildPriorityWork(dashboard), [dashboard]);
  const quickActions = useMemo(
    () => buildQuickActions(hasPermission, workspaceMode),
    [hasPermission, workspaceMode],
  );
  const lifecycleStages = useMemo(() => buildLifecycleStages(dashboard), [dashboard]);

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Dashboard"
        title={`Welcome, ${user?.full_name ?? "there"}`}
        subtitle="A focused view of what needs action now, what is due, and where work sits in the lifecycle."
        status="ACTIVE"
        statusLabel={workspaceLabel}
        primaryAction={renderAction(heroActions.primaryAction)}
        secondaryAction={renderAction(heroActions.secondaryAction)}
      />

      {dashboard.errors.length > 0 && (
        <ErrorState
          message="Some dashboard sections could not load. Available sections are still shown."
          technicalDetails={
            <ul className="space-y-1">
              {dashboard.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          }
          onRetry={() => setReloadToken((current) => current + 1)}
        />
      )}

      {isLoading ? (
        <LoadingState label="Loading dashboard..." rows={6} />
      ) : (
        <>
          <DashboardSection
            title="My Work Today"
            subtitle="Only the four signals that help decide what to do next."
          >
            <MetricGrid metrics={workMetrics} />
          </DashboardSection>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.65fr)]">
            <DashboardSection
              title="Operational Queue"
              subtitle={`${workspaceLabel} focus for the current role.`}
            >
              <MetricGrid metrics={operationalQueue} />
            </DashboardSection>

            <DashboardSection title="Quick Actions" subtitle="Shortcuts matched to this workspace.">
              <QuickActionList actions={quickActions} />
            </DashboardSection>
          </div>

          <SummaryCard
            title="Priority Work"
            subtitle="Your next actions, sorted by urgency."
            action={
              priorityWork.length > 0 ? (
                <Link to={priorityWork[0].path} className={smallLinkClass}>
                  Open Top Item
                </Link>
              ) : null
            }
          >
            <PriorityWorkList items={priorityWork} />
          </SummaryCard>

          <DashboardSection
            title="Pipeline Overview"
            subtitle="Current counts across the content lifecycle."
          >
            <LifecycleOverview stages={lifecycleStages} />
          </DashboardSection>
        </>
      )}
    </PageContainer>
  );
}


function DashboardSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}


function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}


function MetricCard({ metric }: { metric: DashboardMetric }) {
  const card = (
    <KpiCard
      label={metric.label}
      value={metric.value}
      helperText={metric.helperText}
      status={metric.status}
    />
  );

  if (!metric.path) {
    return card;
  }

  return (
    <Link to={metric.path} className="block transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-100">
      {card}
    </Link>
  );
}


function QuickActionList({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">No shortcuts available</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">No role-specific actions are assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="block rounded-md border border-slate-200 px-3 py-3 transition hover:border-brand-100 hover:bg-brand-50/40"
          >
            <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{action.detail}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}


function PriorityWorkList({ items }: { items: WorkItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-slate-900">No open priority items</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Your current role does not have urgent dashboard work waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className="flex flex-col gap-3 py-4 transition first:pt-0 last:pb-0 hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.eyebrow}</p>
            <h3 className="mt-1 truncate text-sm font-semibold text-slate-950">{item.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500">
              {item.reference && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                  {item.reference}
                </span>
              )}
              <span>{item.detail}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {item.dueAt && (
              <span className={getDueBadgeClass(item.dueAt)}>
                {formatDueDate(item.dueAt)}
              </span>
            )}
            {item.status && <StatusBadge status={item.status} />}
            <span className={inlineOpenClass}>Open</span>
          </div>
        </Link>
      ))}
    </div>
  );
}


function LifecycleOverview({ stages }: { stages: LifecycleStage[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 md:grid-cols-5 xl:grid-cols-10">
      {stages.map((stage, index) => (
        <li
          key={stage.label}
          className="rounded-md border border-slate-200 bg-white px-3 py-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {index + 1}
            </span>
            <span className="text-lg font-semibold text-slate-950">{stage.value}</span>
          </div>
          <p className="mt-3 min-h-9 text-xs font-semibold leading-4 text-slate-700">{stage.label}</p>
        </li>
      ))}
    </ol>
  );
}


async function fetchDashboardData(hasPermission: PermissionChecker): Promise<DashboardData> {
  const nextDashboard = createEmptyDashboardData();
  const tasks: Promise<void>[] = [];

  function addSection(label: string, loader: () => Promise<void>) {
    tasks.push(
      loader().catch((error) => {
        nextDashboard.errors.push(`${label}: ${getApiErrorMessage(error)}`);
      }),
    );
  }

  if (canLoadRequestSignals(hasPermission)) {
    addSection("Content requests", async () => {
      nextDashboard.requests = await loadRequestDashboard();
    });
  }

  if (canLoadTherapyTasks(hasPermission)) {
    addSection("Therapy tasks", async () => {
      nextDashboard.therapyTasks = await loadTherapyTaskDashboard();
    });
  }

  if (hasPermission(PERMISSIONS.REVIEW_MEDICAL_CONTENT)) {
    addSection("Medical review tasks", async () => {
      nextDashboard.medicalTasks = await loadMedicalTaskDashboard();
    });
  }

  if (canAccessReviewTasks(hasPermission)) {
    addSection("Review tasks", async () => {
      nextDashboard.reviewTasks = await loadReviewTaskDashboard();
    });
  }

  if (canAccessDocumentLibrary(hasPermission)) {
    addSection("Content library", async () => {
      nextDashboard.documents = await loadDocumentDashboard();
    });
  }

  if (canAccessApprovedMaterials(hasPermission)) {
    addSection("Approved materials", async () => {
      nextDashboard.approvedMaterials = await loadApprovedMaterialDashboard();
    });
  }

  if (canAccessDistribution(hasPermission)) {
    addSection("Distribution", async () => {
      nextDashboard.distribution = await loadDistributionDashboard();
    });
  }

  if (canAccessSalesMaterials(hasPermission)) {
    addSection("Sales materials", async () => {
      nextDashboard.sales = await loadSalesDashboard();
    });
  }

  if (canAccessAdmin(hasPermission)) {
    addSection("Administration", async () => {
      nextDashboard.admin = await loadAdminDashboard();
    });
  }

  await Promise.all(tasks);
  return nextDashboard;
}


async function loadRequestDashboard(): Promise<RequestDashboard> {
  const [
    allRequests,
    myRequests,
    statusCounts,
    draftCounts,
    returnedCounts,
    regionalCounts,
  ] = await Promise.all([
    getMaterialRequests({ page: 1, page_size: 20 }),
    getMaterialRequests({ my_requests: true, page: 1, page_size: 10 }),
    getMaterialRequestStatusCounts(),
    getMaterialRequestStatusCounts({ requested_by_me: true }),
    getMaterialRequestStatusCounts({ returned_to_me: true }),
    getMaterialRequestStatusCounts({ pending_regional_review: true }),
  ]);
  const statusTotals = trackedRequestStatuses.reduce<RequestStatusCounts>((totals, status) => {
    totals[status] = statusCounts.statuses[status] ?? 0;
    return totals;
  }, {});
  const submittedRegionalTotal = getStatusTotal(statusTotals, [
    "SUBMITTED",
    "SUBMITTED_PENDING_REGIONAL_REVIEW",
    "RESUBMITTED",
    "RESUBMITTED_PENDING_REGIONAL_REVIEW",
  ]);
  const underRegionalTotal = getStatusTotal(statusTotals, ["UNDER_REGIONAL_REVIEW"]);
  const approvedRoutedTotal = getStatusTotal(statusTotals, ["APPROVED_ASSIGNED_TO_THERAPY_LEAD"]);
  const therapyTotal = getStatusTotal(statusTotals, [
    "APPROVED_ASSIGNED_TO_THERAPY_LEAD",
    "DRAFT_IN_PROGRESS",
    "DRAFT_VERSION_READY",
  ]);
  const medicalCopyTotal = getStatusTotal(statusTotals, [
    "SUBMITTED_FOR_MEDICAL_REVIEW",
    "MEDICAL_REVIEW_IN_PROGRESS",
    "RESUBMITTED_FOR_MEDICAL_REVIEW",
  ]);
  const medicalRevisionTotal = getStatusTotal(statusTotals, [
    "MEDICAL_REVISION_REQUIRED",
    "MEDICAL_REVISION_IN_PROGRESS",
  ]);
  const designBriefTotal = getStatusTotal(statusTotals, [
    "MEDICAL_CONTENT_APPROVED",
    "DESIGN_BRIEF_IN_PROGRESS",
    "DESIGN_BRIEF_SUBMITTED",
  ]);
  const mlrReviewTotal = getStatusTotal(statusTotals, [
    "READY_FOR_MLR",
    "MLR_IN_REVIEW",
    "MLR_CHANGES_REQUESTED",
  ]);

  return {
    total: allRequests.total,
    myTotal: myRequests.total,
    draftTotal: draftCounts.statuses.DRAFT ?? 0,
    returnedTotal: returnedCounts.total,
    regionalTotal: regionalCounts.total || submittedRegionalTotal + underRegionalTotal,
    submittedRegionalTotal,
    underRegionalTotal,
    approvedRoutedTotal,
    therapyTotal,
    designTotal: getStatusTotal(statusTotals, ["DESIGN_IN_PROGRESS", "DESIGN_DRAFT_UPLOADED"]),
    complianceTotal: getStatusTotal(statusTotals, ["MLR_APPROVED"]),
    finalApprovalTotal: getStatusTotal(statusTotals, ["FINAL_APPROVAL"]),
    medicalCopyTotal,
    medicalRevisionTotal,
    medicalApprovedTotal: getStatusTotal(statusTotals, ["MEDICAL_CONTENT_APPROVED"]),
    designBriefTotal,
    designBriefSubmittedTotal: getStatusTotal(statusTotals, ["DESIGN_BRIEF_SUBMITTED"]),
    proofReadingTotal: getStatusTotal(statusTotals, ["DESIGN_REVIEW", "THERAPY_REVIEW"]),
    mlrReviewTotal,
    finalApprovedTotal: getStatusTotal(statusTotals, ["FINAL_APPROVED"]),
    distributedTotal: getStatusTotal(statusTotals, ["DISTRIBUTED"]),
    statusTotals,
    recentItems: dedupeRequests([...myRequests.items, ...allRequests.items]).slice(0, 10),
  };
}


async function loadTherapyTaskDashboard(): Promise<TherapyTaskDashboard> {
  const tasks = await getTherapyLeadTasks();
  const openItems = tasks.filter((task) => ["OPEN", "IN_PROGRESS"].includes(task.status));
  return {
    total: tasks.length,
    open: tasks.filter((task) => task.status === "OPEN").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    needsAttention: tasks.filter(
      (task) => (task.open_mandatory_comment_count ?? 0) > 0 || (task.reference_issue_count ?? 0) > 0,
    ).length,
    revisionTotal: tasks.filter((task) => task.task_type === "THERAPY_MEDICAL_REVISION").length,
    overdue: openItems.filter((task) => isPastDate(task.due_at ?? task.in_market_date)).length,
    items: sortByDate(openItems, (task) => task.due_at ?? task.in_market_date).slice(0, 10),
  };
}


async function loadMedicalTaskDashboard(): Promise<MedicalTaskDashboard> {
  const tasks = await getMedicalReviewTasks();
  const openItems = tasks.filter((task) => ["OPEN", "IN_PROGRESS"].includes(task.status));
  return {
    total: tasks.length,
    open: tasks.filter((task) => task.status === "OPEN").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    needsAttention: tasks.filter(
      (task) => (task.open_mandatory_comment_count ?? 0) > 0 || (task.reference_issue_count ?? 0) > 0,
    ).length,
    overdue: openItems.filter((task) => isPastDate(task.due_at)).length,
    items: sortByDate(openItems, (task) => task.due_at).slice(0, 10),
  };
}


async function loadReviewTaskDashboard(): Promise<ReviewTaskDashboard> {
  const response = await getTasks({ assigned_to_me: true, page: 1, page_size: 100 });
  const openItems = response.items.filter((task) => !completedReviewStatuses.has(task.status));
  return {
    total: response.total,
    open: openItems.length,
    inProgress: openItems.filter((task) => task.status === "IN_PROGRESS").length,
    overdue: openItems.filter((task) => isPastDate(task.due_date)).length,
    items: sortByDate(openItems, (task) => task.due_date).slice(0, 10),
  };
}


async function loadDocumentDashboard(): Promise<DocumentDashboard> {
  const [allDocuments, ready, inReview, approved] = await Promise.all([
    getDocuments({ page: 1, page_size: 6 }),
    getDocuments({ status: "READY_FOR_REVIEW", page: 1, page_size: 1 }),
    getDocuments({ status: "IN_REVIEW", page: 1, page_size: 1 }),
    getDocuments({ status: "APPROVED", page: 1, page_size: 1 }),
  ]);

  return {
    total: allDocuments.total,
    ready: ready.total,
    inReview: inReview.total,
    approved: approved.total,
    items: allDocuments.items,
  };
}


async function loadApprovedMaterialDashboard(): Promise<ApprovedMaterialDashboard> {
  const [allMaterials, activeMaterials] = await Promise.all([
    getApprovedMaterials({ page: 1, page_size: 1 }),
    getApprovedMaterials({ status: "ACTIVE", page: 1, page_size: 6 }),
  ]);

  return {
    total: allMaterials.total,
    active: activeMaterials.total,
    expiringSoon: activeMaterials.items.filter((material) => isWithinDays(material.valid_until, 45)).length,
    items: activeMaterials.items,
  };
}


async function loadDistributionDashboard(): Promise<DistributionDashboard> {
  const [allPackages, released, scheduled] = await Promise.all([
    getDistributionPackages({ page: 1, page_size: 6 }),
    getDistributionPackages({ status: "RELEASED", page: 1, page_size: 1 }),
    getDistributionPackages({ status: "SCHEDULED", page: 1, page_size: 1 }),
  ]);

  return {
    total: allPackages.total,
    released: released.total,
    scheduled: scheduled.total,
    availableNow: allPackages.items.filter((packageItem) => packageItem.is_currently_available).length,
    items: allPackages.items,
  };
}


async function loadSalesDashboard(): Promise<SalesDashboard> {
  const materials = await getSalesRepMaterials();
  return {
    available: materials.length,
    packages: new Set(materials.map((material) => material.package_id).filter(Boolean)).size,
    expiringSoon: materials.filter((material) => isWithinDays(material.valid_until, 45)).length,
    items: materials.slice(0, 6),
  };
}


async function loadAdminDashboard(): Promise<AdminDashboard> {
  const [setupItems, users, roles] = await Promise.all([
    getSetupChecklist(),
    getUsers(),
    getRoles(),
  ]);
  const requiredMissing = setupItems.filter((item) => item.is_required && !item.is_complete);
  const nextSetupItem = requiredMissing[0] ?? setupItems.find((item) => !item.is_complete) ?? null;

  return {
    users: users.length,
    roles: roles.length,
    setupComplete: setupItems.filter((item) => item.is_complete).length,
    setupTotal: setupItems.length,
    requiredMissing: requiredMissing.length,
    nextSetupAction: nextSetupItem
      ? {
          label: nextSetupItem.action_label,
          path: "/admin/setup-checklist",
          detail: nextSetupItem.label,
        }
      : null,
  };
}


function getWorkspaceMode(hasPermission: PermissionChecker, user: User | null): WorkspaceMode {
  if (user?.is_superuser || canAccessAdmin(hasPermission)) {
    return "system";
  }

  if (canCreateRequests(hasPermission)) {
    return "requester";
  }

  if (
    hasPermission(PERMISSIONS.REGIONAL_EVALUATE_REQUEST) ||
    hasPermission(PERMISSIONS.VIEW_REGION_REQUESTS)
  ) {
    return "regional";
  }

  if (canLoadTherapyTasks(hasPermission)) {
    return "therapy";
  }

  if (
    hasPermission(PERMISSIONS.REVIEW_MEDICAL_CONTENT) ||
    hasPermission(PERMISSIONS.REVIEW_MLR)
  ) {
    return "medical";
  }

  if (
    hasPermission(PERMISSIONS.MANAGE_DESIGN) ||
    hasPermission(PERMISSIONS.UPLOAD_DESIGN_DRAFT) ||
    hasPermission(PERMISSIONS.VIEW_DESIGN_BRIEF)
  ) {
    return "design";
  }

  if (
    hasPermission(PERMISSIONS.FINAL_APPROVE) ||
    hasPermission(PERMISSIONS.ISSUE_MLR_CODE) ||
    hasPermission(PERMISSIONS.MANAGE_APPROVED_MATERIALS)
  ) {
    return "approval";
  }

  if (canAccessDistribution(hasPermission)) {
    return "distribution";
  }

  if (canAccessSalesMaterials(hasPermission)) {
    return "sales";
  }

  return "none";
}


function getWorkspaceLabel(mode: WorkspaceMode): string {
  const labels: Record<WorkspaceMode, string> = {
    system: "Superuser / Admin Workspace",
    requester: "Request Creator Workspace",
    regional: "Regional Review Workspace",
    therapy: "Therapy Lead Workspace",
    medical: "Medical Review Workspace",
    design: "Design Workspace",
    approval: "Approval Workspace",
    distribution: "Distribution Workspace",
    sales: "Sales Workspace",
    none: "Dashboard Workspace",
  };

  return labels[mode];
}


function getHeroActions(
  mode: WorkspaceMode,
  hasPermission: PermissionChecker,
): {
  primaryAction?: DashboardAction | null;
  secondaryAction?: DashboardAction | null;
} {
  return {
    primaryAction: {
      label: "Open My Work",
      path: getMyWorkPath(mode, hasPermission),
      primary: true,
    },
    secondaryAction: canCreateRequests(hasPermission)
      ? {
          label: "Create Content Request",
          path: "/requests/create",
          primary: false,
        }
      : null,
  };
}


function getMyWorkPath(mode: WorkspaceMode, hasPermission: PermissionChecker): string {
  switch (mode) {
    case "system":
      return canAccessAdmin(hasPermission) ? "/admin/setup-checklist" : "/dashboard";
    case "requester":
      return "/requests?view=mine";
    case "regional":
      return "/requests?view=regional-review";
    case "therapy":
      return "/requests?view=therapy-tasks";
    case "medical":
      return canAccessReviewTasks(hasPermission) ? "/tasks?view=assigned" : "/requests?assigned_to_me=true";
    case "design":
      return "/design/tasks";
    case "approval":
      return "/requests?status=FINAL_APPROVAL";
    case "distribution":
      return "/distribution";
    case "sales":
      return "/sales-materials";
    case "none":
      return "/dashboard";
  }
}


function buildMyWorkMetrics(
  dashboard: DashboardData,
  mode: WorkspaceMode,
  hasPermission: PermissionChecker,
): DashboardMetric[] {
  const items = collectPriorityWork(dashboard);
  const needsMyAction = getNeedsMyActionCount(dashboard, mode, items);
  const overdue = items.filter((item) => isPastDate(item.dueAt)).length;
  const dueThisWeek = items.filter((item) => isWithinDays(item.dueAt, 7)).length;
  const recentlyUpdated = getRecentlyUpdatedCount(dashboard, items);
  const workPath = getMyWorkPath(mode, hasPermission);

  return [
    {
      id: "needs-action",
      label: "Needs My Action",
      value: needsMyAction,
      helperText: "Open items in your current workspace",
      status: needsMyAction > 0 ? "warning" : "success",
      path: workPath,
    },
    {
      id: "overdue",
      label: "Overdue",
      value: overdue,
      helperText: "Loaded items past their due date",
      status: overdue > 0 ? "danger" : "success",
      path: workPath,
    },
    {
      id: "due-this-week",
      label: "Due This Week",
      value: dueThisWeek,
      helperText: "Loaded items due in the next 7 days",
      status: dueThisWeek > 0 ? "warning" : "neutral",
      path: workPath,
    },
    {
      id: "recently-updated",
      label: "Recently Updated",
      value: recentlyUpdated,
      helperText: "Activity updated in the last 7 days",
      status: recentlyUpdated > 0 ? "info" : "neutral",
      path: workPath,
    },
  ];
}


function buildOperationalQueue(
  dashboard: DashboardData,
  mode: WorkspaceMode,
  hasPermission: PermissionChecker,
): DashboardMetric[] {
  const requests = dashboard.requests;
  const admin = dashboard.admin;

  switch (mode) {
    case "system":
      return [
        {
          id: "setup-missing",
          label: "Setup Missing",
          value: admin?.requiredMissing ?? 0,
          helperText: "Required setup checklist items",
          status: (admin?.requiredMissing ?? 0) > 0 ? "warning" : "success",
          path: canAccessAdmin(hasPermission) ? "/admin/setup-checklist" : undefined,
        },
        {
          id: "users",
          label: "Users",
          value: admin?.users ?? 0,
          helperText: "Provisioned platform users",
          status: "info",
          path: canManageUsers(hasPermission) ? "/admin/users" : undefined,
        },
        {
          id: "roles",
          label: "Roles",
          value: admin?.roles ?? 0,
          helperText: "Configured access roles",
          status: "info",
          path: canManageUsers(hasPermission) ? "/admin/roles" : undefined,
        },
        {
          id: "master-workflow-health",
          label: "Master Data / Workflow Health",
          value: `${admin?.setupComplete ?? 0}/${admin?.setupTotal ?? 0}`,
          helperText: "Setup checklist completion",
          status: (admin?.requiredMissing ?? 0) > 0 ? "warning" : "success",
          path: canManageMasterData(hasPermission) ? "/admin/master-data" : "/admin",
        },
      ];
    case "requester": {
      const inProgress = Math.max(
        (requests?.myTotal ?? 0) -
          (requests?.draftTotal ?? 0) -
          (requests?.returnedTotal ?? 0) -
          (requests?.regionalTotal ?? 0),
        0,
      );
      return [
        {
          id: "draft-requests",
          label: "Draft Requests",
          value: requests?.draftTotal ?? 0,
          helperText: "Saved intake drafts",
          status: (requests?.draftTotal ?? 0) > 0 ? "warning" : "neutral",
          path: "/requests?status=DRAFT",
        },
        {
          id: "returned-to-me",
          label: "Returned to Me",
          value: requests?.returnedTotal ?? 0,
          helperText: "Requests needing correction",
          status: (requests?.returnedTotal ?? 0) > 0 ? "danger" : "success",
          path: "/requests?view=returned",
        },
        {
          id: "submitted-regional",
          label: "Submitted to Regional",
          value: requests?.regionalTotal ?? 0,
          helperText: "Waiting for regional action",
          status: (requests?.regionalTotal ?? 0) > 0 ? "info" : "neutral",
          path: "/requests?view=mine",
        },
        {
          id: "in-progress",
          label: "In Progress",
          value: inProgress,
          helperText: "Active requests beyond intake",
          status: inProgress > 0 ? "info" : "neutral",
          path: "/requests?view=mine",
        },
      ];
    }
    case "regional":
      return [
        {
          id: "pending-regional",
          label: "Pending Regional Review",
          value: requests?.submittedRegionalTotal ?? requests?.regionalTotal ?? 0,
          helperText: "Submitted or resubmitted requests",
          status: (requests?.regionalTotal ?? 0) > 0 ? "warning" : "neutral",
          path: "/requests?view=regional-review",
        },
        {
          id: "under-regional",
          label: "Under Regional Review",
          value: requests?.underRegionalTotal ?? 0,
          helperText: "Regional evaluation in progress",
          status: (requests?.underRegionalTotal ?? 0) > 0 ? "info" : "neutral",
          path: "/requests?status=UNDER_REGIONAL_REVIEW",
        },
        {
          id: "returned-spoc",
          label: "Returned to SPOC",
          value: getStatusTotal(requests?.statusTotals, ["RETURNED_TO_SPOC", "SPOC_REVISION_IN_PROGRESS"]),
          helperText: "Returned requests awaiting requester edits",
          status: getStatusTotal(requests?.statusTotals, ["RETURNED_TO_SPOC"]) > 0 ? "warning" : "neutral",
          path: "/requests?status=RETURNED_TO_SPOC",
        },
        {
          id: "approved-routed",
          label: "Approved & Routed",
          value: requests?.approvedRoutedTotal ?? 0,
          helperText: "Moved to Therapy Lead",
          status: "success",
          path: "/requests?status=APPROVED_ASSIGNED_TO_THERAPY_LEAD",
        },
      ];
    case "therapy":
      return [
        {
          id: "drafts-to-create",
          label: "Drafts to Create",
          value: dashboard.therapyTasks?.open ?? requests?.approvedRoutedTotal ?? 0,
          helperText: "Assigned content draft tasks",
          status: (dashboard.therapyTasks?.open ?? 0) > 0 ? "warning" : "neutral",
          path: "/requests?view=therapy-tasks",
        },
        {
          id: "drafts-in-progress",
          label: "Drafts In Progress",
          value: dashboard.therapyTasks?.inProgress ?? getStatusTotal(requests?.statusTotals, ["DRAFT_IN_PROGRESS"]),
          helperText: "Therapy drafting underway",
          status: (dashboard.therapyTasks?.inProgress ?? 0) > 0 ? "info" : "neutral",
          path: "/requests?status=DRAFT_IN_PROGRESS",
        },
        {
          id: "medical-changes-required",
          label: "Medical Changes Required",
          value: Math.max(dashboard.therapyTasks?.revisionTotal ?? 0, requests?.medicalRevisionTotal ?? 0),
          helperText: "Medical revision work",
          status: Math.max(dashboard.therapyTasks?.revisionTotal ?? 0, requests?.medicalRevisionTotal ?? 0) > 0 ? "warning" : "success",
          path: "/requests?status=MEDICAL_REVISION_REQUIRED",
        },
        {
          id: "ready-for-design",
          label: "Ready for Design",
          value: requests?.medicalApprovedTotal ?? 0,
          helperText: "Medical-approved content",
          status: (requests?.medicalApprovedTotal ?? 0) > 0 ? "info" : "neutral",
          path: "/requests?status=MEDICAL_CONTENT_APPROVED",
        },
      ];
    case "medical":
      return [
        {
          id: "medical-copy-reviews",
          label: "Medical Copy Reviews",
          value: (dashboard.medicalTasks?.open ?? 0) + (dashboard.medicalTasks?.inProgress ?? 0),
          helperText: "Open medical review tasks",
          status: ((dashboard.medicalTasks?.open ?? 0) + (dashboard.medicalTasks?.inProgress ?? 0)) > 0 ? "warning" : "neutral",
          path: "/requests?view=medical-review-tasks",
        },
        {
          id: "final-mlr-reviews",
          label: "Final MLR Reviews",
          value: dashboard.reviewTasks?.open ?? requests?.mlrReviewTotal ?? 0,
          helperText: "Assigned review queue",
          status: (dashboard.reviewTasks?.open ?? 0) > 0 ? "warning" : "neutral",
          path: "/tasks?view=assigned",
        },
        {
          id: "comments-pending",
          label: "Comments / References Pending",
          value: dashboard.medicalTasks?.needsAttention ?? 0,
          helperText: "Mandatory comments or reference issues",
          status: (dashboard.medicalTasks?.needsAttention ?? 0) > 0 ? "warning" : "success",
          path: "/requests?view=medical-review-tasks",
        },
        {
          id: "overdue-reviews",
          label: "Overdue Reviews",
          value: (dashboard.medicalTasks?.overdue ?? 0) + (dashboard.reviewTasks?.overdue ?? 0),
          helperText: "Open reviews past due date",
          status: ((dashboard.medicalTasks?.overdue ?? 0) + (dashboard.reviewTasks?.overdue ?? 0)) > 0 ? "danger" : "success",
          path: "/tasks?view=assigned",
        },
      ];
    case "design":
      return [
        {
          id: "new-design-jobs",
          label: "New Design Jobs",
          value: requests?.designBriefSubmittedTotal ?? 0,
          helperText: "Submitted design briefs",
          status: (requests?.designBriefSubmittedTotal ?? 0) > 0 ? "warning" : "neutral",
          path: "/design/tasks",
        },
        {
          id: "design-in-progress",
          label: "Design In Progress",
          value: requests?.designTotal ?? 0,
          helperText: "Active design production",
          status: (requests?.designTotal ?? 0) > 0 ? "info" : "neutral",
          path: "/design/tasks",
        },
        {
          id: "revision-requested",
          label: "Revision Requested",
          value: getStatusTotal(requests?.statusTotals, ["THERAPY_CHANGES_REQUESTED", "MLR_CHANGES_REQUESTED"]),
          helperText: "Design-related changes requested",
          status: getStatusTotal(requests?.statusTotals, ["THERAPY_CHANGES_REQUESTED", "MLR_CHANGES_REQUESTED"]) > 0 ? "warning" : "success",
          path: "/requests?status=MLR_CHANGES_REQUESTED",
        },
        {
          id: "ready-therapy-review",
          label: "Ready for Therapy Review",
          value: requests?.proofReadingTotal ?? 0,
          helperText: "Design review or proofing step",
          status: (requests?.proofReadingTotal ?? 0) > 0 ? "info" : "neutral",
          path: "/requests?status=DESIGN_REVIEW",
        },
      ];
    case "approval":
      return [
        {
          id: "mlr-code",
          label: "MLR Code",
          value: requests?.complianceTotal ?? 0,
          helperText: "Approved reviews awaiting code",
          status: (requests?.complianceTotal ?? 0) > 0 ? "warning" : "success",
          path: "/requests?status=MLR_APPROVED",
        },
        {
          id: "final-approval",
          label: "Final Approval",
          value: requests?.finalApprovalTotal ?? 0,
          helperText: "Final material approvals",
          status: (requests?.finalApprovalTotal ?? 0) > 0 ? "warning" : "success",
          path: "/requests?status=FINAL_APPROVAL",
        },
        {
          id: "ready-publish",
          label: "Ready to Publish",
          value: requests?.finalApprovedTotal ?? 0,
          helperText: "Approved requests ready for material record",
          status: (requests?.finalApprovedTotal ?? 0) > 0 ? "info" : "neutral",
          path: "/requests?status=FINAL_APPROVED",
        },
        {
          id: "active-materials",
          label: "Active Materials",
          value: dashboard.approvedMaterials?.active ?? 0,
          helperText: "Approved material records",
          status: "success",
          path: "/approved-materials",
        },
      ];
    case "distribution":
      return [
        {
          id: "scheduled-packages",
          label: "Scheduled Packages",
          value: dashboard.distribution?.scheduled ?? 0,
          helperText: "Packages waiting for release",
          status: (dashboard.distribution?.scheduled ?? 0) > 0 ? "warning" : "neutral",
          path: "/distribution?status=SCHEDULED",
        },
        {
          id: "released-packages",
          label: "Released Packages",
          value: dashboard.distribution?.released ?? 0,
          helperText: "Released to sales users",
          status: "success",
          path: "/distribution?status=RELEASED",
        },
        {
          id: "available-now",
          label: "Available Now",
          value: dashboard.distribution?.availableNow ?? 0,
          helperText: "Packages currently available",
          status: "info",
          path: "/distribution",
        },
        {
          id: "total-packages",
          label: "Total Packages",
          value: dashboard.distribution?.total ?? 0,
          helperText: "Visible distribution packages",
          status: "neutral",
          path: "/distribution",
        },
      ];
    case "sales":
      return [
        {
          id: "available-materials",
          label: "Available Materials",
          value: dashboard.sales?.available ?? 0,
          helperText: "Materials available for field use",
          status: "success",
          path: "/sales-materials",
        },
        {
          id: "expiring-soon",
          label: "Expiring Soon",
          value: dashboard.sales?.expiringSoon ?? 0,
          helperText: "Visible materials expiring within 45 days",
          status: (dashboard.sales?.expiringSoon ?? 0) > 0 ? "warning" : "success",
          path: "/sales-materials",
        },
        {
          id: "packages",
          label: "Packages",
          value: dashboard.sales?.packages ?? 0,
          helperText: "Released packages with material access",
          status: "info",
          path: "/sales-materials",
        },
        {
          id: "recent-materials",
          label: "Recently Updated",
          value: dashboard.sales?.items.length ?? 0,
          helperText: "Loaded material cards",
          status: "neutral",
          path: "/sales-materials",
        },
      ];
    case "none":
      return [
        {
          id: "dashboard-access",
          label: "Dashboard Access",
          value: 0,
          helperText: "No role-specific dashboard queue is assigned",
          status: "neutral",
        },
      ];
  }
}


function buildPriorityWork(dashboard: DashboardData): WorkItem[] {
  return collectPriorityWork(dashboard)
    .sort((left, right) => {
      if (left.weight !== right.weight) {
        return left.weight - right.weight;
      }
      return getDateTime(left.dueAt ?? left.sortDate) - getDateTime(right.dueAt ?? right.sortDate);
    })
    .slice(0, 5);
}


function collectPriorityWork(dashboard: DashboardData): WorkItem[] {
  const items: WorkItem[] = [];

  if (dashboard.admin?.nextSetupAction && dashboard.admin.requiredMissing > 0) {
    items.push({
      id: "admin-setup",
      eyebrow: "Setup",
      title: dashboard.admin.nextSetupAction.detail,
      detail: dashboard.admin.nextSetupAction.label,
      path: dashboard.admin.nextSetupAction.path,
      reference: `${dashboard.admin.requiredMissing} required`,
      status: "WARNING",
      weight: 0,
    });
  }

  dashboard.reviewTasks?.items.forEach((task) => {
    items.push({
      id: `review-task-${task.id}`,
      eyebrow: task.stage_name || task.required_role || "Review Task",
      title: task.document?.title ?? task.document?.document_number ?? `Task ${task.id}`,
      detail: "Review is assigned to you",
      path: `/tasks/${task.id}`,
      reference: task.document?.document_number ?? `Task ${task.id}`,
      status: task.status,
      dueAt: task.due_date,
      sortDate: task.due_date,
      weight: isPastDate(task.due_date) ? 0 : 2,
    });
  });

  dashboard.therapyTasks?.items.forEach((task) => {
    items.push({
      id: `therapy-task-${task.task_id}`,
      eyebrow: task.task_type === "THERAPY_MEDICAL_REVISION" ? "Therapy Revision" : "Therapy Draft",
      title: task.request_title ?? task.request_code ?? `Request ${task.request_id}`,
      detail: task.current_action || task.action_label || "Open request context",
      path: task.task_type === "THERAPY_MEDICAL_REVISION"
        ? `/requests/${task.request_id}/medical-review`
        : task.content_workspace
          ? `/documents/${task.content_workspace.id}/authoring`
          : `/requests/${task.request_id}`,
      reference: task.request_code,
      status: task.status,
      dueAt: task.due_at ?? task.in_market_date,
      sortDate: task.due_at ?? task.in_market_date,
      weight: (task.open_mandatory_comment_count ?? 0) > 0 || isPastDate(task.due_at) ? 0 : 1,
    });
  });

  dashboard.medicalTasks?.items.forEach((task) => {
    items.push({
      id: `medical-task-${task.task_id}`,
      eyebrow: "Medical Review",
      title: task.request_title ?? task.request_code ?? `Request ${task.request_id}`,
      detail: `${task.content_workspace_code ?? "Content workspace"} ${task.draft_version?.version_label ?? ""}`.trim(),
      path: `/requests/${task.request_id}/medical-review`,
      reference: task.request_code ?? task.content_workspace_code,
      status: task.status,
      dueAt: task.due_at,
      sortDate: task.due_at,
      weight: (task.open_mandatory_comment_count ?? 0) > 0 || isPastDate(task.due_at) ? 0 : 1,
    });
  });

  dashboard.requests?.recentItems.forEach((request) => {
    const isActionStatus = [
      "DRAFT",
      "RETURNED_TO_SPOC",
      "SPOC_REVISION_IN_PROGRESS",
      "SUBMITTED_PENDING_REGIONAL_REVIEW",
      "RESUBMITTED_PENDING_REGIONAL_REVIEW",
      "UNDER_REGIONAL_REVIEW",
      "APPROVED_ASSIGNED_TO_THERAPY_LEAD",
      "MEDICAL_REVISION_REQUIRED",
      "MLR_APPROVED",
      "FINAL_APPROVAL",
    ].includes(request.status);

    if (!isActionStatus) {
      return;
    }

    items.push({
      id: `request-${request.id}`,
      eyebrow: getRequestStageLabel(request.status),
      title: request.title ?? request.request_title ?? "Untitled content request",
      detail: request.next_action_label ?? request.current_owner_label ?? getRequestStageDetail(request.status),
      path: request.status === "DRAFT" ? `/requests/${request.id}/edit` : `/requests/${request.id}`,
      reference: request.request_number,
      status: request.status,
      dueAt: request.required_by_date ?? request.in_market_date,
      sortDate: request.updated_at,
      weight: request.status === "RETURNED_TO_SPOC" || request.status === "SPOC_REVISION_IN_PROGRESS" ? 0 : 4,
    });
  });

  dashboard.documents?.items.forEach((document) => {
    items.push({
      id: `document-${document.id}`,
      eyebrow: "Document",
      title: document.title,
      detail: document.material_request?.request_number
        ? `Linked to ${document.material_request.request_number}`
        : "Review content record",
      path: `/documents/${document.id}`,
      reference: document.document_number,
      status: document.status,
      dueAt: document.expiry_date,
      sortDate: document.updated_at,
      weight: document.status === "READY_FOR_REVIEW" ? 2 : 6,
    });
  });

  dashboard.approvedMaterials?.items.forEach((material) => {
    items.push({
      id: `approved-material-${material.id}`,
      eyebrow: "Approved Material",
      title: material.material_title,
      detail: material.mlr_code ? `MLR ${material.mlr_code}` : "Approved material",
      path: `/approved-materials/${material.id}`,
      reference: material.material_code,
      status: material.status,
      dueAt: material.valid_until,
      sortDate: material.valid_until,
      weight: isWithinDays(material.valid_until, 45) ? 1 : 7,
    });
  });

  dashboard.distribution?.items.forEach((packageItem) => {
    items.push({
      id: `distribution-${packageItem.id}`,
      eyebrow: "Distribution",
      title: packageItem.package_name,
      detail: `${packageItem.material_count} materials included`,
      path: `/distribution/${packageItem.id}`,
      reference: packageItem.campaign_name,
      status: packageItem.status,
      dueAt: packageItem.release_date,
      sortDate: packageItem.updated_at,
      weight: packageItem.status === "SCHEDULED" ? 2 : 8,
    });
  });

  dashboard.sales?.items.forEach((material) => {
    items.push({
      id: `sales-material-${material.package_id}-${material.material_id}`,
      eyebrow: "Sales Material",
      title: material.material_title ?? "Untitled material",
      detail: material.package_name ?? "Released package",
      path: "/sales-materials",
      reference: material.material_code,
      status: material.status,
      dueAt: material.valid_until,
      sortDate: material.valid_until,
      weight: isWithinDays(material.valid_until, 45) ? 1 : 9,
    });
  });

  return dedupeBy(items, (item) => item.path);
}


function buildQuickActions(hasPermission: PermissionChecker, mode: WorkspaceMode): QuickAction[] {
  const actions: QuickAction[] = [];

  function addAction(action: QuickAction, canShow = true) {
    if (canShow) {
      actions.push(action);
    }
  }

  switch (mode) {
    case "system":
      addAction({
        label: "Open Setup Checklist",
        path: "/admin/setup-checklist",
        detail: "Review missing setup items.",
      }, canAccessAdmin(hasPermission));
      addAction({
        label: "Open Users",
        path: "/admin/users",
        detail: "Manage user access.",
      }, canManageUsers(hasPermission));
      addAction({
        label: "Open Roles",
        path: "/admin/roles",
        detail: "Review role permissions.",
      }, canManageUsers(hasPermission));
      addAction({
        label: "Open Master Data",
        path: "/admin/master-data",
        detail: "Maintain controlled options.",
      }, canManageMasterData(hasPermission));
      addAction({
        label: "Create Content Request",
        path: "/requests/create",
        detail: "Start a new request.",
      }, canCreateRequests(hasPermission));
      break;
    case "requester":
      addAction({
        label: "Create Content Request",
        path: "/requests/create",
        detail: "Start a new intake.",
      }, canCreateRequests(hasPermission));
      addAction({
        label: "Open My Work",
        path: "/requests?view=mine",
        detail: "Continue your requests.",
      });
      addAction({
        label: "Open Returned Requests",
        path: "/requests?view=returned",
        detail: "Fix requests returned to you.",
      });
      addAction({
        label: "Open Draft Requests",
        path: "/requests?status=DRAFT",
        detail: "Complete saved drafts.",
      });
      break;
    case "regional":
      addAction({
        label: "Open Regional Queue",
        path: "/requests?view=regional-review",
        detail: "Review submitted requests.",
      });
      addAction({
        label: "Under Regional Review",
        path: "/requests?status=UNDER_REGIONAL_REVIEW",
        detail: "Continue evaluations.",
      });
      addAction({
        label: "Returned to SPOC",
        path: "/requests?status=RETURNED_TO_SPOC",
        detail: "Track returned requests.",
      });
      break;
    case "therapy":
      addAction({
        label: "Open Therapy Tasks",
        path: "/requests?view=therapy-tasks",
        detail: "Open draft creation work.",
      });
      addAction({
        label: "Drafts In Progress",
        path: "/requests?status=DRAFT_IN_PROGRESS",
        detail: "Continue therapy drafts.",
      });
      addAction({
        label: "Medical Changes Required",
        path: "/requests?status=MEDICAL_REVISION_REQUIRED",
        detail: "Resolve medical feedback.",
      });
      break;
    case "medical":
      addAction({
        label: "Open Medical Reviews",
        path: "/tasks?view=assigned",
        detail: "Review assigned tasks.",
      }, canAccessReviewTasks(hasPermission));
      addAction({
        label: "Medical Review Requests",
        path: "/requests?view=medical-review-tasks",
        detail: "Open request context.",
      });
      addAction({
        label: "Open Content Library",
        path: "/library",
        detail: "Search review content.",
      }, canAccessDocumentLibrary(hasPermission));
      break;
    case "design":
      addAction({
        label: "Open Design Jobs",
        path: "/design/tasks",
        detail: "Manage assigned design tasks.",
      });
      addAction({
        label: "Design In Progress",
        path: "/requests?status=DESIGN_IN_PROGRESS",
        detail: "View production requests.",
      });
      addAction({
        label: "Submitted Briefs",
        path: "/requests?status=DESIGN_BRIEF_SUBMITTED",
        detail: "Open new design briefs.",
      });
      break;
    case "approval":
      addAction({
        label: "Open Final Approval",
        path: "/requests?status=FINAL_APPROVAL",
        detail: "Approve final materials.",
      });
      addAction({
        label: "Open MLR Code Queue",
        path: "/requests?status=MLR_APPROVED",
        detail: "Issue MLR codes.",
      }, hasPermission(PERMISSIONS.ISSUE_MLR_CODE));
      addAction({
        label: "Open Approved Materials",
        path: "/approved-materials",
        detail: "Review governed materials.",
      }, canAccessApprovedMaterials(hasPermission));
      break;
    case "distribution":
      addAction({
        label: "Open Distribution",
        path: "/distribution",
        detail: "Manage packages.",
      });
      addAction({
        label: "Create Package",
        path: "/distribution/create",
        detail: "Prepare a release bundle.",
      }, hasPermission(PERMISSIONS.CREATE_DISTRIBUTION));
      addAction({
        label: "Open Approved Materials",
        path: "/approved-materials",
        detail: "Find materials to release.",
      }, canAccessApprovedMaterials(hasPermission));
      break;
    case "sales":
      addAction({
        label: "Open Sales Materials",
        path: "/sales-materials",
        detail: "Use available materials.",
      });
      break;
    case "none":
      break;
  }

  return dedupeBy(actions, (action) => action.path).slice(0, 5);
}


function buildLifecycleStages(dashboard: DashboardData): LifecycleStage[] {
  const requests = dashboard.requests;

  return [
    {
      label: "Intake",
      value: getStatusTotal(requests?.statusTotals, ["DRAFT", "RETURNED_TO_SPOC", "SPOC_REVISION_IN_PROGRESS"]),
    },
    {
      label: "Regional",
      value: getStatusTotal(requests?.statusTotals, [
        "SUBMITTED",
        "SUBMITTED_PENDING_REGIONAL_REVIEW",
        "RESUBMITTED",
        "RESUBMITTED_PENDING_REGIONAL_REVIEW",
        "UNDER_REGIONAL_REVIEW",
      ]),
    },
    {
      label: "Therapy Draft",
      value: getStatusTotal(requests?.statusTotals, [
        "APPROVED_ASSIGNED_TO_THERAPY_LEAD",
        "DRAFT_IN_PROGRESS",
        "DRAFT_VERSION_READY",
      ]),
    },
    {
      label: "Medical Copy",
      value: getStatusTotal(requests?.statusTotals, [
        "SUBMITTED_FOR_MEDICAL_REVIEW",
        "MEDICAL_REVIEW_IN_PROGRESS",
        "MEDICAL_REVISION_REQUIRED",
        "MEDICAL_REVISION_IN_PROGRESS",
        "RESUBMITTED_FOR_MEDICAL_REVIEW",
      ]),
    },
    {
      label: "Design",
      value: getStatusTotal(requests?.statusTotals, [
        "MEDICAL_CONTENT_APPROVED",
        "DESIGN_BRIEF_IN_PROGRESS",
        "DESIGN_BRIEF_SUBMITTED",
        "DESIGN_IN_PROGRESS",
        "DESIGN_DRAFT_UPLOADED",
      ]),
    },
    {
      label: "Proof Reading",
      value: getStatusTotal(requests?.statusTotals, ["DESIGN_REVIEW", "THERAPY_REVIEW"]),
    },
    {
      label: "Final MLR",
      value: Math.max(
        getStatusTotal(requests?.statusTotals, ["READY_FOR_MLR", "MLR_IN_REVIEW", "MLR_CHANGES_REQUESTED"]),
        dashboard.reviewTasks?.open ?? 0,
      ),
    },
    {
      label: "MLR Code",
      value: getStatusTotal(requests?.statusTotals, ["MLR_APPROVED"]),
    },
    {
      label: "Publish",
      value: Math.max(
        getStatusTotal(requests?.statusTotals, ["FINAL_APPROVAL", "FINAL_APPROVED"]),
        dashboard.approvedMaterials?.active ?? 0,
      ),
    },
    {
      label: "Distribution",
      value: Math.max(
        getStatusTotal(requests?.statusTotals, ["DISTRIBUTED"]),
        (dashboard.distribution?.released ?? 0) + (dashboard.distribution?.scheduled ?? 0),
      ),
    },
  ];
}


function getNeedsMyActionCount(dashboard: DashboardData, mode: WorkspaceMode, items: WorkItem[]): number {
  const requests = dashboard.requests;

  switch (mode) {
    case "system":
      return (dashboard.admin?.requiredMissing ?? 0) + (dashboard.reviewTasks?.overdue ?? 0);
    case "requester":
      return (requests?.draftTotal ?? 0) + (requests?.returnedTotal ?? 0);
    case "regional":
      return (requests?.submittedRegionalTotal ?? 0) + (requests?.underRegionalTotal ?? 0);
    case "therapy":
      return (dashboard.therapyTasks?.open ?? 0) + (dashboard.therapyTasks?.inProgress ?? 0);
    case "medical":
      return (dashboard.medicalTasks?.open ?? 0) + (dashboard.medicalTasks?.inProgress ?? 0) + (dashboard.reviewTasks?.open ?? 0);
    case "design":
      return (requests?.designBriefSubmittedTotal ?? 0) + (requests?.designTotal ?? 0);
    case "approval":
      return (requests?.complianceTotal ?? 0) + (requests?.finalApprovalTotal ?? 0);
    case "distribution":
      return (dashboard.distribution?.scheduled ?? 0) + (dashboard.distribution?.availableNow ?? 0);
    case "sales":
      return dashboard.sales?.expiringSoon ?? 0;
    case "none":
      return items.length;
  }
}


function getRecentlyUpdatedCount(dashboard: DashboardData, items: WorkItem[]): number {
  const recentItems = items.filter((item) => isWithinPastDays(item.sortDate, 7)).length;
  const recentRequests = dashboard.requests?.recentItems.filter((request) => isWithinPastDays(request.updated_at, 7)).length ?? 0;
  const recentDocuments = dashboard.documents?.items.filter((document) => isWithinPastDays(document.updated_at, 7)).length ?? 0;
  const recentDistribution = dashboard.distribution?.items.filter((packageItem) => isWithinPastDays(packageItem.updated_at, 7)).length ?? 0;

  return Math.max(recentItems, recentRequests + recentDocuments + recentDistribution);
}


function canLoadRequestSignals(hasPermission: PermissionChecker): boolean {
  return (
    canCreateRequests(hasPermission) ||
    hasPermission(PERMISSIONS.UPDATE_REQUEST) ||
    hasPermission(PERMISSIONS.REGIONAL_EVALUATE_REQUEST) ||
    hasPermission(PERMISSIONS.VIEW_REGION_REQUESTS) ||
    hasPermission(PERMISSIONS.AUTHOR_CONTENT) ||
    hasPermission(PERMISSIONS.CREATE_CONTENT_DRAFT) ||
    hasPermission(PERMISSIONS.VIEW_THERAPY_PIPELINE) ||
    hasPermission(PERMISSIONS.REVIEW_MEDICAL_CONTENT) ||
    hasPermission(PERMISSIONS.ISSUE_MLR_CODE) ||
    hasPermission(PERMISSIONS.MANAGE_DESIGN) ||
    hasPermission(PERMISSIONS.FINAL_APPROVE)
  );
}


function canLoadTherapyTasks(hasPermission: PermissionChecker): boolean {
  return (
    hasPermission(PERMISSIONS.AUTHOR_CONTENT) ||
    hasPermission(PERMISSIONS.CREATE_CONTENT_DRAFT) ||
    hasPermission(PERMISSIONS.VIEW_THERAPY_PIPELINE)
  );
}


function canManageUsers(hasPermission: PermissionChecker): boolean {
  return hasPermission(PERMISSIONS.MANAGE_SYSTEM) || hasPermission(PERMISSIONS.MANAGE_USERS);
}


function canManageMasterData(hasPermission: PermissionChecker): boolean {
  return hasPermission(PERMISSIONS.MANAGE_SYSTEM) || hasPermission(PERMISSIONS.MANAGE_MASTER_DATA);
}


function getStatusTotal(
  statusTotals: RequestStatusCounts | undefined,
  statuses: readonly MaterialRequestStatus[],
): number {
  return statuses.reduce((total, status) => total + (statusTotals?.[status] ?? 0), 0);
}


function dedupeRequests(requests: MaterialRequest[]): MaterialRequest[] {
  return dedupeBy(requests, (request) => request.id);
}


function dedupeBy<T>(items: T[], getKey: (item: T) => string | number | null | undefined): T[] {
  const seen = new Set<string | number>();
  return items.filter((item) => {
    const key = getKey(item);
    if (key === null || key === undefined || seen.has(key)) {
      return key === null || key === undefined;
    }
    seen.add(key);
    return true;
  });
}


function sortByDate<T>(items: T[], getDate: (item: T) => string | null | undefined): T[] {
  return [...items].sort((left, right) => getDateTime(getDate(left)) - getDateTime(getDate(right)));
}


function getDateTime(value: string | null | undefined): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}


function isPastDate(value: string | null | undefined): boolean {
  const time = getDateTime(value);
  return time !== Number.MAX_SAFE_INTEGER && time < Date.now();
}


function isWithinDays(value: string | null | undefined, days: number): boolean {
  const time = getDateTime(value);
  if (time === Number.MAX_SAFE_INTEGER) {
    return false;
  }

  const now = Date.now();
  return time >= now && time <= now + days * 24 * 60 * 60 * 1000;
}


function isWithinPastDays(value: string | null | undefined, days: number): boolean {
  const time = getDateTime(value);
  if (time === Number.MAX_SAFE_INTEGER) {
    return false;
  }

  const now = Date.now();
  return time <= now && time >= now - days * 24 * 60 * 60 * 1000;
}


function formatDueDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Date not set";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


function getDueBadgeClass(value: string): string {
  const baseClass = "rounded-full border px-2.5 py-1 text-xs font-semibold leading-none";
  if (isPastDate(value)) {
    return `${baseClass} border-rose-200 bg-rose-50 text-rose-700`;
  }

  if (isWithinDays(value, 7)) {
    return `${baseClass} border-amber-200 bg-amber-50 text-amber-800`;
  }

  return `${baseClass} border-slate-200 bg-slate-50 text-slate-600`;
}


function getRequestStageLabel(status: MaterialRequestStatus): string {
  const stageByStatus: Partial<Record<MaterialRequestStatus, string>> = {
    DRAFT: "Intake",
    RETURNED_TO_SPOC: "Intake",
    SPOC_REVISION_IN_PROGRESS: "Intake",
    SUBMITTED: "Regional",
    SUBMITTED_PENDING_REGIONAL_REVIEW: "Regional",
    UNDER_REGIONAL_REVIEW: "Regional",
    RESUBMITTED: "Regional",
    RESUBMITTED_PENDING_REGIONAL_REVIEW: "Regional",
    APPROVED_ASSIGNED_TO_THERAPY_LEAD: "Therapy Draft",
    DRAFT_IN_PROGRESS: "Therapy Draft",
    DRAFT_VERSION_READY: "Therapy Draft",
    SUBMITTED_FOR_MEDICAL_REVIEW: "Medical Copy",
    MEDICAL_REVIEW_IN_PROGRESS: "Medical Copy",
    MEDICAL_REVISION_REQUIRED: "Medical Copy",
    MEDICAL_REVISION_IN_PROGRESS: "Medical Copy",
    RESUBMITTED_FOR_MEDICAL_REVIEW: "Medical Copy",
    MEDICAL_CONTENT_APPROVED: "Design",
    DESIGN_BRIEF_IN_PROGRESS: "Design",
    DESIGN_BRIEF_SUBMITTED: "Design",
    DESIGN_IN_PROGRESS: "Design",
    DESIGN_DRAFT_UPLOADED: "Design",
    DESIGN_REVIEW: "Proof Reading",
    READY_FOR_MLR: "Final MLR",
    MLR_IN_REVIEW: "Final MLR",
    MLR_CHANGES_REQUESTED: "Final MLR",
    MLR_APPROVED: "MLR Code",
    FINAL_APPROVAL: "Publish",
    FINAL_APPROVED: "Publish",
    DISTRIBUTED: "Distribution",
  };

  return stageByStatus[status] ?? "Content Request";
}


function getRequestStageDetail(status: MaterialRequestStatus): string {
  const detailByStatus: Partial<Record<MaterialRequestStatus, string>> = {
    DRAFT: "Complete and submit intake details",
    RETURNED_TO_SPOC: "Revise and resubmit request details",
    SPOC_REVISION_IN_PROGRESS: "Requester revision is in progress",
    UNDER_REGIONAL_REVIEW: "Regional team is evaluating request fit",
    APPROVED_ASSIGNED_TO_THERAPY_LEAD: "Therapy Lead draft creation is ready",
    DRAFT_IN_PROGRESS: "Therapy draft is in progress",
    SUBMITTED_FOR_MEDICAL_REVIEW: "Medical review submission is queued",
    MEDICAL_REVIEW_IN_PROGRESS: "Medical review is underway",
    MEDICAL_REVISION_REQUIRED: "Medical revision is required",
    MEDICAL_CONTENT_APPROVED: "Design brief creation is ready",
    DESIGN_BRIEF_IN_PROGRESS: "Design brief is being prepared",
    DESIGN_BRIEF_SUBMITTED: "Design brief is waiting for Design",
    READY_FOR_MLR: "Final MLR review is ready",
    MLR_IN_REVIEW: "Final MLR review is underway",
    MLR_CHANGES_REQUESTED: "MLR changes are required",
    MLR_APPROVED: "Compliance code issuance is ready",
    DESIGN_IN_PROGRESS: "Design production is active",
    DESIGN_DRAFT_UPLOADED: "Design Draft V1 is waiting for Step 5C review",
    DESIGN_REVIEW: "Proof reading or design review is active",
    FINAL_APPROVAL: "Final approval is waiting",
    FINAL_APPROVED: "Final material is approved",
    DISTRIBUTED: "Material has been distributed",
  };

  return detailByStatus[status] ?? "Open request activity";
}

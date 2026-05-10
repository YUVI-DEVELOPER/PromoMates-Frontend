import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { downloadAsset } from "../../api/assets";
import { getDocumentContentVersions } from "../../api/contentVersions";
import { getDocument } from "../../api/documents";
import {
  getContentVersionComplianceRecord,
  getOrCreateContentVersionComplianceRecord,
  issueMlrCode,
  updateComplianceRecord,
} from "../../api/legalCompliance";
import {
  createReviewAnnotation,
  dismissReviewAnnotation,
  getTaskReviewAnnotations,
  reopenReviewAnnotation,
  resolveReviewAnnotation,
} from "../../api/reviewAnnotations";
import { decideTask, getTask, startTask } from "../../api/reviews";
import { ComplianceRecordPanel } from "../../components/reviews/ComplianceRecordPanel";
import { ReviewAnnotationsPanel } from "../../components/reviews/ReviewAnnotationsPanel";
import { TaskDecisionModal } from "../../components/reviews/TaskDecisionModal";
import { ContentViewer } from "../../components/viewer/ContentViewer";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { ViewerAsset } from "../../types/asset";
import type { ContentVersion } from "../../types/contentVersion";
import type { DocumentDetail } from "../../types/document";
import type { LegalComplianceRecord, LegalComplianceRecordIssueCodePayload, LegalComplianceRecordUpdatePayload } from "../../types/legalCompliance";
import type { ReviewAnnotation, ReviewAnnotationCreatePayload } from "../../types/reviewAnnotation";
import type { ReviewDecision, ReviewTask, TaskDecisionPayload } from "../../types/review";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";


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


function getDecisionLabel(decision: ReviewDecision): string {
  if (decision === "APPROVE") {
    return "Approved";
  }

  if (decision === "REJECT") {
    return "Rejected";
  }

  return "Changes Requested";
}


export function TaskDetail() {
  const { taskId } = useParams();
  const { hasPermission, user } = useAuth();
  const [task, setTask] = useState<ReviewTask | null>(null);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnnotationLoading, setIsAnnotationLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [annotationErrorMessage, setAnnotationErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [complianceRecord, setComplianceRecord] = useState<LegalComplianceRecord | null>(null);
  const [taskContentVersionId, setTaskContentVersionId] = useState<string | null>(null);
  const [taskContentVersion, setTaskContentVersion] = useState<ContentVersion | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [complianceErrorMessage, setComplianceErrorMessage] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    decision: ReviewDecision;
  }>({
    isOpen: false,
    decision: "APPROVE",
  });
  const numericTaskId = Number(taskId);
  const isSuperuser = Boolean(user?.is_superuser);
  const canUpdateCompliance = hasPermission(PERMISSIONS.UPDATE_COMPLIANCE_CHECKLIST);
  const canIssueCompliance = hasPermission(PERMISSIONS.ISSUE_MLR_CODE);
  const userRoleIds = new Set((user?.roles ?? []).map((role) => role.id));
  const userGroupIds = new Set((user?.groups ?? []).map((group) => group.id));
  const matchesRequiredGroup = Boolean(
    task && (!task.required_group_id || userGroupIds.has(task.required_group_id)),
  );
  const canClaim = Boolean(
    task &&
      !task.assignee_id &&
      task.required_role_id &&
      userRoleIds.has(task.required_role_id) &&
      matchesRequiredGroup,
  );
  const canAct = Boolean(task && (isSuperuser || task.assignee_id === user?.id || canClaim));
  const canStart = canAct && task?.status === "PENDING";
  const canDecide = canAct && (task?.status === "PENDING" || task?.status === "IN_PROGRESS");
  const openMandatoryCount = annotations.filter(
    (annotation) =>
      annotation.is_mandatory_change &&
      (annotation.status === "OPEN" || annotation.status === "REOPENED"),
  ).length;

  const loadAnnotations = useCallback(async () => {
    if (!Number.isFinite(numericTaskId)) {
      return;
    }

    setIsAnnotationLoading(true);
    setAnnotationErrorMessage(null);

    try {
      const response = await getTaskReviewAnnotations(numericTaskId, { page_size: 100 });
      setAnnotations(response.items);
    } catch (error) {
      setAnnotations([]);
      setAnnotationErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAnnotationLoading(false);
    }
  }, [numericTaskId]);

  const loadTask = useCallback(async () => {
    if (!Number.isFinite(numericTaskId)) {
      setErrorMessage("Review task not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextTask = await getTask(numericTaskId);
      setTask(nextTask);

      try {
        const nextDocument = await getDocument(nextTask.document_id);
        setDocument(nextDocument);
      } catch {
        setDocument(null);
      }
      await loadAnnotations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [loadAnnotations, numericTaskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const loadComplianceRecord = useCallback(async () => {
    if (!task) {
      setComplianceRecord(null);
      setTaskContentVersionId(null);
      setTaskContentVersion(null);
      return;
    }

    setIsComplianceLoading(true);
    setComplianceErrorMessage(null);

    try {
      let contentVersionId: string | null = null;
      let selectedContentVersion: ContentVersion | null = null;
      const currentMlrResponse = await getDocumentContentVersions(task.document_id, {
        content_stage: "MLR_REVIEW",
        is_current: true,
        page_size: 1,
      });
      if (currentMlrResponse.items.length > 0) {
        selectedContentVersion = currentMlrResponse.items[0];
        contentVersionId = selectedContentVersion.id;
      } else {
        const fallbackResponse = await getDocumentContentVersions(task.document_id, {
          page_size: 100,
        });
        const fallback = [...fallbackResponse.items].sort((left, right) => {
          if (left.is_current !== right.is_current) {
            return left.is_current ? -1 : 1;
          }
          if (left.version_number !== right.version_number) {
            return right.version_number - left.version_number;
          }
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        })[0];
        selectedContentVersion = fallback ?? null;
        contentVersionId = fallback?.id ?? null;
      }

      setTaskContentVersionId(contentVersionId);
      setTaskContentVersion(selectedContentVersion);

      if (!contentVersionId) {
        setComplianceRecord(null);
        setTaskContentVersion(null);
        setComplianceErrorMessage("No content version found for this review task.");
        return;
      }

      try {
        const nextRecord = canUpdateCompliance
          ? await getOrCreateContentVersionComplianceRecord(contentVersionId)
          : await getContentVersionComplianceRecord(contentVersionId);
        setComplianceRecord(nextRecord);
      } catch (error) {
        setComplianceRecord(null);
        setComplianceErrorMessage(getApiErrorMessage(error));
      }
    } catch (error) {
      setComplianceRecord(null);
      setTaskContentVersion(null);
      setComplianceErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsComplianceLoading(false);
    }
  }, [canUpdateCompliance, task]);

  useEffect(() => {
    void loadComplianceRecord();
  }, [loadComplianceRecord]);

  async function handleStartTask() {
    if (!task) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);

    try {
      const updatedTask = await startTask(task.id);
      setTask(updatedTask);
      setSuccessMessage("Task started.");
      await loadAnnotations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDecisionSubmit(payload: TaskDecisionPayload) {
    if (!task) {
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);
    setWarningMessage(null);
    setSuccessMessage(null);

    try {
      const updatedTask = await decideTask(task.id, payload);
      setTask(updatedTask);
      setDecisionModal((current) => ({ ...current, isOpen: false }));
      setSuccessMessage("Decision saved.");
      await loadTask();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleCreateAnnotation(payload: ReviewAnnotationCreatePayload) {
    setAnnotationErrorMessage(null);
    try {
      await createReviewAnnotation(payload);
      await loadAnnotations();
      await loadComplianceRecord();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAnnotationErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleResolveAnnotation(annotationId: string, resolutionNote: string | null) {
    setAnnotationErrorMessage(null);
    try {
      await resolveReviewAnnotation(annotationId, resolutionNote);
      await loadAnnotations();
      await loadComplianceRecord();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAnnotationErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleReopenAnnotation(annotationId: string) {
    setAnnotationErrorMessage(null);
    try {
      await reopenReviewAnnotation(annotationId);
      await loadAnnotations();
      await loadComplianceRecord();
    } catch (error) {
      setAnnotationErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleDismissAnnotation(annotationId: string, resolutionNote: string | null) {
    setAnnotationErrorMessage(null);
    try {
      await dismissReviewAnnotation(annotationId, resolutionNote);
      await loadAnnotations();
      await loadComplianceRecord();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setAnnotationErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleDownloadViewerAsset(asset: ViewerAsset) {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await downloadAsset(asset.id, asset.original_filename);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function handleSaveCompliance(recordId: string, payload: LegalComplianceRecordUpdatePayload) {
    setComplianceErrorMessage(null);
    try {
      await updateComplianceRecord(recordId, payload);
      await loadComplianceRecord();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setComplianceErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleIssueComplianceCode(recordId: string, payload: LegalComplianceRecordIssueCodePayload) {
    setComplianceErrorMessage(null);
    try {
      await issueMlrCode(recordId, payload);
      await loadComplianceRecord();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setComplianceErrorMessage(message);
      throw new Error(message);
    }
  }

  function openDecisionModal(decision: ReviewDecision) {
    if (decision === "CHANGES_REQUESTED" && openMandatoryCount === 0) {
      setSuccessMessage(null);
      setWarningMessage(
        "No mandatory annotations added. You can still request changes, but structured comments help the creator fix the material.",
      );
    } else {
      setWarningMessage(null);
    }
    setDecisionModal({ isOpen: true, decision });
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState label="Loading review task..." rows={4} />
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <ErrorState message={errorMessage || "Review task not found."} />
        <Link to="/tasks" className={secondaryButtonClass}>
          Back to My Review Tasks
        </Link>
      </PageContainer>
    );
  }

  const assigneeLabel =
    task.assignee?.full_name ??
    (task.assignee_id
      ? `User ${task.assignee_id}`
      : canClaim
        ? task.required_group_id
          ? "Unassigned - available to your role and group"
          : "Unassigned - available to your role"
        : "Unassigned");
  const requiredRoleLabel = task.required_role_ref?.name ?? formatRole(task.required_role);
  const requiredGroupLabel = task.required_group_id
    ? task.required_group_name ?? `Group ${task.required_group_id}`
    : "No group scope";
  const taskPreviewAsset = (taskContentVersion?.asset ?? null) as ViewerAsset | null;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow={`Task ${task.id}`}
        title={task.stage_name}
        subtitle={document ? `${document.document_number}: ${document.title}` : `Document ${task.document_id}`}
        status={task.status}
        metadata={[
          { label: "Required Role", value: requiredRoleLabel },
          { label: "Required Group", value: requiredGroupLabel },
          { label: "Assignee", value: assigneeLabel },
          { label: "Due Date", value: formatDateTime(task.due_date) },
          { label: "Review", value: `Review ${task.review_id}` },
        ]}
        primaryAction={
          canStart ? (
            <button
              type="button"
              onClick={handleStartTask}
              disabled={isActionLoading}
              className={primaryButtonClass}
            >
              {isActionLoading ? "Starting..." : "Start Task"}
            </button>
          ) : undefined
        }
        secondaryAction={
          <Link to="/tasks" className={secondaryButtonClass}>
            Back to Tasks
          </Link>
        }
      />

      {(errorMessage || warningMessage || successMessage) && (
        <div
          className={[
            "rounded-lg border px-4 py-3 text-sm shadow-sm",
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : warningMessage
                ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {errorMessage || warningMessage || successMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Task Status" value={<StatusBadge status={task.status} />} helperText="Current task state" status="info" />
        <KpiCard label="Stage Order" value={task.stage_order} helperText="Workflow stage position" status="neutral" />
        <KpiCard label="Decision" value={task.decision ? getDecisionLabel(task.decision) : "None"} helperText="Recorded reviewer decision" status={task.decision === "REJECT" ? "danger" : task.decision ? "success" : "neutral"} />
        <KpiCard label="Decided At" value={task.decided_at ? formatDateTime(task.decided_at) : "Not decided"} helperText={task.decided_by?.full_name ?? "Awaiting decision"} status="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SummaryCard
          title="Document"
          subtitle="Open the document dashboard for file versions, review history, and state history."
          action={
            <Link to={`/library/${task.document_id}`} className={secondaryButtonClass}>
              Open Document
            </Link>
          }
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Document Number" value={document?.document_number ?? `Document ${task.document_id}`} />
            <DetailRow label="Title" value={document?.title ?? "Not loaded"} />
            <DetailRow label="Status" value={document ? <StatusBadge status={document.status} /> : "Not loaded"} />
            <DetailRow label="Owner" value={document?.owner?.full_name ?? (document ? `User ${document.owner_id}` : "Not loaded")} />
          </dl>
        </SummaryCard>

        <SummaryCard
          title="Task Details"
          subtitle="Decision actions are available to assigned reviewers, matching-role reviewers, or superusers."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Stage" value={`${task.stage_order}. ${task.stage_name}`} />
            <DetailRow label="Required Role" value={requiredRoleLabel} />
            <DetailRow label="Required Group" value={requiredGroupLabel} />
            <DetailRow label="Assignee" value={assigneeLabel} />
            <DetailRow label="Due Date" value={formatDateTime(task.due_date)} />
            <DetailRow label="Decision" value={task.decision ? <StatusBadge status={task.decision} label={getDecisionLabel(task.decision)} /> : "No decision"} />
            <DetailRow label="Decided By" value={task.decided_by?.full_name ?? (task.decided_by_id ? `User ${task.decided_by_id}` : "Not decided")} />
            <DetailRow label="Decided At" value={formatDateTime(task.decided_at)} />
            <DetailRow label="Created" value={formatDateTime(task.created_at)} />
          </dl>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decision Comment
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {task.decision_comment || "No decision comment recorded."}
            </p>
          </div>

          {canDecide && (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => openDecisionModal("APPROVE")}
                disabled={isActionLoading}
                className={primaryButtonClass}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => openDecisionModal("CHANGES_REQUESTED")}
                disabled={isActionLoading}
                className={secondaryButtonClass}
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => openDecisionModal("REJECT")}
                disabled={isActionLoading}
                className={dangerButtonClass}
              >
                Reject
              </button>
            </div>
          )}
        </SummaryCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <ContentViewer
          asset={taskPreviewAsset}
          contentVersion={taskContentVersion}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          canAnnotate={canAct && hasPermission(PERMISSIONS.ADD_REVIEW_ANNOTATION) && Boolean(taskContentVersion)}
          defaultCreatePayload={{
            review_task_id: task.id,
            document_id: task.document_id,
          }}
          onCreateAnnotation={handleCreateAnnotation}
          onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
          onDownload={handleDownloadViewerAsset}
          title="Review Content Preview"
          subtitle="Use the current review content version while recording task feedback."
        />

        <ReviewAnnotationsPanel
          annotations={annotations}
          isLoading={isAnnotationLoading}
          errorMessage={annotationErrorMessage}
          subtitle="Add slide, page, claim, safety, or reference-specific comments before making your decision."
          selectedAnnotationId={selectedAnnotationId}
          canAdd={canAct && hasPermission(PERMISSIONS.ADD_REVIEW_ANNOTATION) && Boolean(taskContentVersionId)}
          canResolve={isSuperuser || hasPermission(PERMISSIONS.RESOLVE_REVIEW_ANNOTATION)}
          canReopen={canAct}
          canDismiss={isSuperuser || hasPermission(PERMISSIONS.RESOLVE_REVIEW_ANNOTATION)}
          defaultCreatePayload={{
            review_task_id: task.id,
            document_id: task.document_id,
            content_version_id: taskContentVersionId,
          }}
          onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
          onCreate={handleCreateAnnotation}
          onResolve={handleResolveAnnotation}
          onReopen={handleReopenAnnotation}
          onDismiss={handleDismissAnnotation}
        />
      </div>

      <ComplianceRecordPanel
        record={complianceRecord}
        contentVersionId={taskContentVersionId}
        isLoading={isComplianceLoading}
        errorMessage={complianceErrorMessage}
        subtitle="MLR code can be issued after the request/document is MLR approved and checklist is complete."
        canCreate={canUpdateCompliance}
        canEditChecklist={canUpdateCompliance}
        canIssueCode={canIssueCompliance}
        onSave={handleSaveCompliance}
        onIssueCode={handleIssueComplianceCode}
      />

      <TaskDecisionModal
        isOpen={decisionModal.isOpen}
        initialDecision={decisionModal.decision}
        isSubmitting={isActionLoading}
        errorMessage={errorMessage}
        onClose={() => setDecisionModal((current) => ({ ...current, isOpen: false }))}
        onSubmit={handleDecisionSubmit}
      />
    </PageContainer>
  );
}


type DetailRowProps = {
  label: string;
  value: ReactNode;
};


function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}

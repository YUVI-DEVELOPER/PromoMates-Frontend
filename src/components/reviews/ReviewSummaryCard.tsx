import { StatusBadge } from "../ui/StatusBadge";
import { SummaryCard } from "../ui/SummaryCard";
import type { Review, ReviewTaskStatus } from "../../types/review";


type ReviewSummaryCardProps = {
  review: Review;
};


const taskStatuses: ReviewTaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "APPROVED",
  "CHANGES_REQUESTED",
  "REJECTED",
];


const taskLabels: Record<ReviewTaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  REJECTED: "Rejected",
  SKIPPED: "Skipped",
};


function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not completed";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function ReviewSummaryCard({ review }: ReviewSummaryCardProps) {
  const tasks = review.tasks ?? [];
  const counts = taskStatuses.reduce<Record<ReviewTaskStatus, number>>(
    (accumulator, status) => ({
      ...accumulator,
      [status]: tasks.filter((task) => task.status === status).length,
    }),
    {
      PENDING: 0,
      IN_PROGRESS: 0,
      APPROVED: 0,
      CHANGES_REQUESTED: 0,
      REJECTED: 0,
      SKIPPED: 0,
    },
  );
  const workflowLabel = review.workflow
    ? `${review.workflow.name}${"code" in review.workflow ? ` (${review.workflow.code})` : ""}`
    : `Workflow ID ${review.workflow_id}`;

  return (
    <SummaryCard
      title="Review Summary"
      subtitle="Current MLR review state and task outcome mix for this document."
      action={<StatusBadge status={review.status} />}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Submitted By" value={review.submitted_by?.full_name ?? `User ${review.submitted_by_id}`} />
          <DetailRow label="Submitted At" value={formatDateTime(review.submitted_at)} />
          <DetailRow label="Completed At" value={formatDateTime(review.completed_at)} />
          <DetailRow label="Workflow" value={workflowLabel} />
        </dl>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {taskStatuses.map((status) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-600">{taskLabels[status]}</span>
              <span className="text-sm font-semibold text-slate-950">{counts[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </SummaryCard>
  );
}


type DetailRowProps = {
  label: string;
  value: string;
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

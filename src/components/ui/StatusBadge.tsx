export type StatusBadgeStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "SUBMITTED_PENDING_REGIONAL_REVIEW"
  | "UNDER_REGIONAL_REVIEW"
  | "RETURNED_TO_SPOC"
  | "SPOC_REVISION_IN_PROGRESS"
  | "RESUBMITTED"
  | "RESUBMITTED_PENDING_REGIONAL_REVIEW"
  | "APPROVED_ASSIGNED_TO_THERAPY_LEAD"
  | "DRAFT_IN_PROGRESS"
  | "DRAFT_VERSION_READY"
  | "SUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_REVIEW_IN_PROGRESS"
  | "MEDICAL_REVISION_REQUIRED"
  | "MEDICAL_REVISION_IN_PROGRESS"
  | "RESUBMITTED_FOR_MEDICAL_REVIEW"
  | "MEDICAL_CONTENT_APPROVED"
  | "DESIGN_BRIEF_IN_PROGRESS"
  | "DESIGN_BRIEF_SUBMITTED"
  | "DEFERRED"
  | "MERGED"
  | "CLOSED"
  | "THERAPY_REVIEW"
  | "THERAPY_CHANGES_REQUESTED"
  | "MARKETING_REVIEW"
  | "MARKETING_CHANGES_REQUESTED"
  | "READY_FOR_MLR"
  | "MLR_IN_REVIEW"
  | "MLR_CHANGES_REQUESTED"
  | "MLR_APPROVED"
  | "DESIGN_IN_PROGRESS"
  | "DESIGN_DRAFT_UPLOADED"
  | "DESIGN_REVIEW_IN_PROGRESS"
  | "DESIGN_APPROVED"
  | "DESIGN_REVISION_REQUIRED"
  | "DESIGN_REVISION_IN_PROGRESS"
  | "DESIGN_REVIEW"
  | "FINAL_APPROVAL"
  | "FINAL_APPROVED"
  | "DISTRIBUTED"
  | "SCHEDULED"
  | "RELEASED"
  | "READY_FOR_REVIEW"
  | "SUBMITTED_TO_DESIGN"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "WITHDRAWN"
  | "SUPERSEDED"
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "RETURNED"
  | "CANCELLED"
  | "SKIPPED"
  | "APPROVE"
  | "REJECT"
  | "FAILED"
  | "WARNING";


type StatusBadgeProps = {
  status: StatusBadgeStatus | string;
  label?: string;
  className?: string;
};


const statusStyles: Record<StatusBadgeStatus, string> = {
  DRAFT: "border-slate-300 bg-slate-50 text-slate-700",
  SUBMITTED: "border-sky-200 bg-sky-50 text-sky-700",
  SUBMITTED_PENDING_REGIONAL_REVIEW: "border-sky-200 bg-sky-50 text-sky-700",
  UNDER_REGIONAL_REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  RETURNED_TO_SPOC: "border-orange-200 bg-orange-50 text-orange-800",
  SPOC_REVISION_IN_PROGRESS: "border-teal-200 bg-teal-50 text-teal-800",
  RESUBMITTED: "border-sky-200 bg-sky-50 text-sky-700",
  RESUBMITTED_PENDING_REGIONAL_REVIEW: "border-sky-200 bg-sky-50 text-sky-700",
  APPROVED_ASSIGNED_TO_THERAPY_LEAD: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DRAFT_IN_PROGRESS: "border-teal-200 bg-teal-50 text-teal-800",
  DRAFT_VERSION_READY: "border-teal-200 bg-teal-50 text-teal-800",
  SUBMITTED_FOR_MEDICAL_REVIEW: "border-sky-200 bg-sky-50 text-sky-700",
  MEDICAL_REVIEW_IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  MEDICAL_REVISION_REQUIRED: "border-orange-200 bg-orange-50 text-orange-800",
  MEDICAL_REVISION_IN_PROGRESS: "border-teal-200 bg-teal-50 text-teal-800",
  RESUBMITTED_FOR_MEDICAL_REVIEW: "border-sky-200 bg-sky-50 text-sky-700",
  MEDICAL_CONTENT_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DESIGN_BRIEF_IN_PROGRESS: "border-teal-200 bg-teal-50 text-teal-800",
  DESIGN_BRIEF_SUBMITTED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  DEFERRED: "border-zinc-300 bg-zinc-50 text-zinc-700",
  MERGED: "border-violet-200 bg-violet-50 text-violet-700",
  CLOSED: "border-zinc-300 bg-zinc-50 text-zinc-700",
  THERAPY_REVIEW: "border-violet-200 bg-violet-50 text-violet-700",
  THERAPY_CHANGES_REQUESTED: "border-orange-200 bg-orange-50 text-orange-800",
  MARKETING_REVIEW: "border-cyan-200 bg-cyan-50 text-cyan-800",
  MARKETING_CHANGES_REQUESTED: "border-orange-200 bg-orange-50 text-orange-800",
  READY_FOR_MLR: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MLR_IN_REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  MLR_CHANGES_REQUESTED: "border-orange-200 bg-orange-50 text-orange-800",
  MLR_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DESIGN_IN_PROGRESS: "border-indigo-200 bg-indigo-50 text-indigo-700",
  DESIGN_DRAFT_UPLOADED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  DESIGN_REVIEW_IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  DESIGN_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DESIGN_REVISION_REQUIRED: "border-orange-200 bg-orange-50 text-orange-800",
  DESIGN_REVISION_IN_PROGRESS: "border-teal-200 bg-teal-50 text-teal-800",
  DESIGN_REVIEW: "border-indigo-200 bg-indigo-50 text-indigo-700",
  FINAL_APPROVAL: "border-teal-200 bg-teal-50 text-teal-800",
  FINAL_APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DISTRIBUTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700",
  RELEASED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  READY_FOR_REVIEW: "border-sky-200 bg-sky-50 text-sky-700",
  SUBMITTED_TO_DESIGN: "border-indigo-200 bg-indigo-50 text-indigo-700",
  IN_REVIEW: "border-amber-200 bg-amber-50 text-amber-800",
  CHANGES_REQUESTED: "border-orange-200 bg-orange-50 text-orange-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  EXPIRED: "border-red-200 bg-red-50 text-red-700",
  WITHDRAWN: "border-zinc-300 bg-zinc-50 text-zinc-700",
  SUPERSEDED: "border-violet-200 bg-violet-50 text-violet-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-slate-300 bg-slate-50 text-slate-600",
  PENDING: "border-slate-300 bg-slate-50 text-slate-700",
  IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RETURNED: "border-orange-200 bg-orange-50 text-orange-800",
  CANCELLED: "border-zinc-300 bg-zinc-50 text-zinc-700",
  SKIPPED: "border-slate-300 bg-slate-50 text-slate-600",
  APPROVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECT: "border-rose-200 bg-rose-50 text-rose-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-800",
};


const statusLabels: Record<StatusBadgeStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SUBMITTED_PENDING_REGIONAL_REVIEW: "Pending Regional Review",
  UNDER_REGIONAL_REVIEW: "Under Regional Review",
  RETURNED_TO_SPOC: "Returned to SPOC",
  SPOC_REVISION_IN_PROGRESS: "SPOC Revision In Progress",
  RESUBMITTED: "Resubmitted",
  RESUBMITTED_PENDING_REGIONAL_REVIEW: "Resubmitted Pending Regional Review",
  APPROVED_ASSIGNED_TO_THERAPY_LEAD: "Approved And Assigned",
  DRAFT_IN_PROGRESS: "Draft In Progress",
  DRAFT_VERSION_READY: "Draft Version Ready",
  SUBMITTED_FOR_MEDICAL_REVIEW: "Submitted for Medical Review",
  MEDICAL_REVIEW_IN_PROGRESS: "Medical Review In Progress",
  MEDICAL_REVISION_REQUIRED: "Medical Revision Required",
  MEDICAL_REVISION_IN_PROGRESS: "Medical Revision In Progress",
  RESUBMITTED_FOR_MEDICAL_REVIEW: "Resubmitted for Medical Review",
  MEDICAL_CONTENT_APPROVED: "Medical Content Approved",
  DESIGN_BRIEF_IN_PROGRESS: "Design Brief In Progress",
  DESIGN_BRIEF_SUBMITTED: "Design Brief Submitted",
  DEFERRED: "Deferred",
  MERGED: "Merged",
  CLOSED: "Closed",
  THERAPY_REVIEW: "Therapy Review",
  THERAPY_CHANGES_REQUESTED: "Therapy Changes Requested",
  MARKETING_REVIEW: "Marketing Review",
  MARKETING_CHANGES_REQUESTED: "Marketing Changes Requested",
  READY_FOR_MLR: "Ready for MLR",
  MLR_IN_REVIEW: "MLR In Review",
  MLR_CHANGES_REQUESTED: "MLR Changes Requested",
  MLR_APPROVED: "MLR Approved",
  DESIGN_IN_PROGRESS: "Design In Progress",
  DESIGN_DRAFT_UPLOADED: "Design Draft Uploaded",
  DESIGN_REVIEW_IN_PROGRESS: "Design Review In Progress",
  DESIGN_APPROVED: "Design Approved",
  DESIGN_REVISION_REQUIRED: "Design Revision Required",
  DESIGN_REVISION_IN_PROGRESS: "Design Revision In Progress",
  DESIGN_REVIEW: "Design Review",
  FINAL_APPROVAL: "Final Approval",
  FINAL_APPROVED: "Final Approved",
  DISTRIBUTED: "Distributed",
  SCHEDULED: "Scheduled",
  RELEASED: "Released",
  READY_FOR_REVIEW: "Ready for Review",
  SUBMITTED_TO_DESIGN: "Submitted to Design",
  IN_REVIEW: "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
  SUPERSEDED: "Superseded",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  SKIPPED: "Skipped",
  APPROVE: "Approve",
  REJECT: "Reject",
  FAILED: "Failed",
  WARNING: "Warning",
};


function isKnownStatus(status: string): status is StatusBadgeStatus {
  return status in statusStyles;
}


function formatFallbackLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}


export function getStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return "None";
  }

  return isKnownStatus(status) ? statusLabels[status] : formatFallbackLabel(status);
}


export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();
  const style = isKnownStatus(normalizedStatus)
    ? statusStyles[normalizedStatus]
    : "border-slate-300 bg-slate-50 text-slate-700";
  const accessibleLabel = label ?? getStatusLabel(normalizedStatus);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        style,
        className,
      ].join(" ")}
    >
      {accessibleLabel}
    </span>
  );
}

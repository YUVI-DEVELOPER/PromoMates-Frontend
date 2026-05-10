import type { DocumentStatus } from "../../types/document";
import {
  StatusBadge,
  getStatusLabel,
  type StatusBadgeStatus,
} from "../ui/StatusBadge";


const statusLabels: Record<DocumentStatus, string> = {
  DRAFT: "Draft",
  DRAFT_IN_PROGRESS: "Draft In Progress",
  SUBMITTED_FOR_MEDICAL_REVIEW: "Submitted for Medical Review",
  MEDICAL_REVIEW_IN_PROGRESS: "Medical Review In Progress",
  MEDICAL_REVISION_REQUIRED: "Medical Revision Required",
  MEDICAL_REVISION_IN_PROGRESS: "Medical Revision In Progress",
  RESUBMITTED_FOR_MEDICAL_REVIEW: "Resubmitted for Medical Review",
  MEDICAL_CONTENT_APPROVED: "Medical Content Approved",
  DESIGN_BRIEF_SUBMITTED: "Design Brief Submitted",
  DESIGN_IN_PROGRESS: "Design In Progress",
  DESIGN_DRAFT_UPLOADED: "Design Draft Uploaded",
  READY_FOR_REVIEW: "Ready for Review",
  IN_REVIEW: "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
};


const statusClasses: Record<DocumentStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  DRAFT_IN_PROGRESS: "bg-teal-50 text-teal-700",
  SUBMITTED_FOR_MEDICAL_REVIEW: "bg-sky-50 text-sky-700",
  MEDICAL_REVIEW_IN_PROGRESS: "bg-amber-50 text-amber-700",
  MEDICAL_REVISION_REQUIRED: "bg-orange-50 text-orange-700",
  MEDICAL_REVISION_IN_PROGRESS: "bg-teal-50 text-teal-700",
  RESUBMITTED_FOR_MEDICAL_REVIEW: "bg-sky-50 text-sky-700",
  MEDICAL_CONTENT_APPROVED: "bg-emerald-50 text-emerald-700",
  DESIGN_BRIEF_SUBMITTED: "bg-indigo-50 text-indigo-700",
  DESIGN_IN_PROGRESS: "bg-indigo-50 text-indigo-700",
  DESIGN_DRAFT_UPLOADED: "bg-indigo-50 text-indigo-700",
  READY_FOR_REVIEW: "bg-sky-50 text-sky-700",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  EXPIRED: "bg-violet-50 text-violet-700",
  WITHDRAWN: "bg-zinc-100 text-zinc-700",
};


type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};


export function getDocumentStatusLabel(status: DocumentStatus | null | undefined): string {
  return status ? getStatusLabel(status) : "None";
}


export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return <StatusBadge status={status as StatusBadgeStatus} label={statusLabels[status]} />;
}

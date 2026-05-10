import { FormEvent, useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "../ui/EmptyState";
import { SummaryCard } from "../ui/SummaryCard";
import type {
  ReviewAnnotation,
  ReviewAnnotationCreatePayload,
  ReviewAnnotationSeverity,
  ReviewAnnotationType,
} from "../../types/reviewAnnotation";
import {
  reviewAnnotationStatusLabels,
  reviewAnnotationTypeLabels,
  reviewAnnotationTypeOptions,
} from "../../types/reviewAnnotation";


type ReviewAnnotationsPanelProps = {
  annotations: ReviewAnnotation[];
  isLoading?: boolean;
  errorMessage?: string | null;
  title?: string;
  subtitle?: ReactNode;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  canAdd?: boolean;
  canResolve?: boolean;
  canReopen?: boolean;
  canDismiss?: boolean;
  showReviewMetadataFields?: boolean;
  categoryOptions?: Array<{ value: string; label: string }>;
  severityOptions?: Array<{ value: ReviewAnnotationSeverity; label: string }>;
  selectedAnnotationId?: string | null;
  hoveredAnnotationId?: string | null;
  defaultCreatePayload?: Partial<ReviewAnnotationCreatePayload>;
  onSelectAnnotation?: (annotation: ReviewAnnotation) => void;
  onHoverAnnotation?: (annotation: ReviewAnnotation | null) => void;
  onCreate?: (payload: ReviewAnnotationCreatePayload) => Promise<void> | void;
  onResolve?: (annotationId: string, resolutionNote: string | null) => Promise<void> | void;
  onReopen?: (annotationId: string) => Promise<void> | void;
  onDismiss?: (annotationId: string, resolutionNote: string | null) => Promise<void> | void;
};


const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const dangerButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";


function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function badgeClass(kind: "type" | "metadata" | "mandatory" | "OPEN" | "REOPENED" | "RESOLVED" | "DISMISSED"): string {
  const classes = {
    type: "border-sky-200 bg-sky-50 text-sky-800",
    metadata: "border-slate-200 bg-slate-50 text-slate-700",
    mandatory: "border-amber-200 bg-amber-50 text-amber-800",
    OPEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REOPENED: "border-violet-200 bg-violet-50 text-violet-800",
    RESOLVED: "border-slate-200 bg-slate-100 text-slate-700",
    DISMISSED: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return [
    "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
    classes[kind],
  ].join(" ");
}


function sortAnnotations(annotations: ReviewAnnotation[]): ReviewAnnotation[] {
  const statusOrder = {
    REOPENED: 0,
    OPEN: 1,
    RESOLVED: 2,
    DISMISSED: 3,
  };

  return [...annotations].sort((left, right) => {
    if (left.status !== right.status) {
      return statusOrder[left.status] - statusOrder[right.status];
    }

    if (left.is_mandatory_change !== right.is_mandatory_change) {
      return left.is_mandatory_change ? -1 : 1;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}


function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "Timestamp";
  }
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}


function anchorLabel(annotation: ReviewAnnotation): string | null {
  if (annotation.anchor_type === "DOCUMENT_PIN") {
    return annotation.page_number ? `Page ${annotation.page_number} pin` : "Document pin";
  }
  if (annotation.anchor_type === "DOCUMENT_BOX") {
    return annotation.page_number ? `Page ${annotation.page_number} box` : "Document box";
  }
  if (annotation.anchor_type === "TEXT_SELECTION") {
    return annotation.page_number ? `Page ${annotation.page_number} text` : "Text selection";
  }
  if (annotation.anchor_type === "VIDEO_TIMESTAMP") {
    return formatTimestamp(annotation.timestamp_seconds);
  }
  return null;
}


export function ReviewAnnotationsPanel({
  annotations,
  isLoading = false,
  errorMessage = null,
  title = "Review Comments",
  subtitle = "Structured comments tied to content versions, slides, pages, claims, or file elements.",
  emptyStateTitle = "No review comments yet",
  emptyStateDescription = "Add slide, page, claim, safety, or reference-specific comments before making your decision.",
  canAdd = false,
  canResolve = false,
  canReopen = false,
  canDismiss = false,
  showReviewMetadataFields = false,
  categoryOptions = [
    { value: "DESIGN", label: "Design" },
    { value: "OTHER", label: "Other" },
  ],
  severityOptions = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "CRITICAL", label: "Critical" },
  ],
  selectedAnnotationId = null,
  hoveredAnnotationId = null,
  defaultCreatePayload = {},
  onSelectAnnotation,
  onHoverAnnotation,
  onCreate,
  onResolve,
  onReopen,
  onDismiss,
}: ReviewAnnotationsPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [annotationType, setAnnotationType] = useState<ReviewAnnotationType>(defaultCreatePayload.annotation_type ?? "GENERAL");
  const [commentCategory, setCommentCategory] = useState(categoryOptions[0]?.value ?? "DESIGN");
  const [severity, setSeverity] = useState<ReviewAnnotationSeverity>("MEDIUM");
  const [elementReference, setElementReference] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isMandatoryChange, setIsMandatoryChange] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const sortedAnnotations = useMemo(() => sortAnnotations(annotations), [annotations]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      setFormError("Comment text is required.");
      return;
    }

    if (!onCreate) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await onCreate({
        ...defaultCreatePayload,
        annotation_type: annotationType,
        category: showReviewMetadataFields ? commentCategory : defaultCreatePayload.category ?? null,
        comment_category: showReviewMetadataFields ? commentCategory : defaultCreatePayload.comment_category ?? null,
        severity: showReviewMetadataFields ? severity : defaultCreatePayload.severity ?? null,
        element_reference: elementReference.trim() || null,
        comment_text: trimmedComment,
        is_mandatory: isMandatoryChange,
        is_mandatory_change: isMandatoryChange,
      });
      setAnnotationType(defaultCreatePayload.annotation_type ?? "GENERAL");
      setCommentCategory(categoryOptions[0]?.value ?? "DESIGN");
      setSeverity("MEDIUM");
      setElementReference("");
      setCommentText("");
      setIsMandatoryChange(false);
      setIsFormOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create annotation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolve(annotationId: string) {
    if (!onResolve) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await onResolve(annotationId, resolutionNote.trim() || null);
      setResolvingId(null);
      setResolutionNote("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not resolve annotation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDismiss(annotationId: string) {
    if (!onDismiss) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await onDismiss(annotationId, resolutionNote.trim() || null);
      setResolvingId(null);
      setResolutionNote("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not dismiss annotation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SummaryCard
      title={title}
      subtitle={subtitle}
      action={
        canAdd && onCreate ? (
          <button
            type="button"
            onClick={() => setIsFormOpen((current) => !current)}
            className={secondaryButtonClass}
          >
            {isFormOpen ? "Close" : "Add Annotation"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {(errorMessage || formError) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage || formError}
          </div>
        )}

        {isFormOpen && canAdd && (
          <form onSubmit={handleCreate} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Type</span>
                <select
                  value={annotationType}
                  onChange={(event) => setAnnotationType(event.target.value as ReviewAnnotationType)}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  {reviewAnnotationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Element Reference</span>
                <input
                  value={elementReference}
                  onChange={(event) => setElementReference(event.target.value)}
                  maxLength={255}
                  placeholder="Slide 3, Page 2, Claim block 1"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>

            {showReviewMetadataFields && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-slate-700">Category</span>
                  <select
                    value={commentCategory}
                    onChange={(event) => setCommentCategory(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-slate-700">Severity</span>
                  <select
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value as ReviewAnnotationSeverity)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {severityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className="mt-4 grid gap-1 text-sm">
              <span className="font-semibold text-slate-700">Comment</span>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Claim needs supporting reference."
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isMandatoryChange}
                  onChange={(event) => setIsMandatoryChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                />
                Mandatory change
              </label>
              <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                {isSubmitting ? "Saving..." : "Save Annotation"}
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-md border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        ) : sortedAnnotations.length === 0 ? (
          <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
        ) : (
          <div className="grid gap-4">
            {sortedAnnotations.map((annotation) => {
              const isSelected = annotation.id === selectedAnnotationId;
              const isHovered = annotation.id === hoveredAnnotationId;
              const visualLabel = anchorLabel(annotation);

              return (
              <article
                key={annotation.id}
                onClick={() => onSelectAnnotation?.(annotation)}
                onMouseEnter={() => onHoverAnnotation?.(annotation)}
                onMouseLeave={() => onHoverAnnotation?.(null)}
                className={[
                  "rounded-md border bg-white p-4 shadow-sm transition",
                  isSelected
                    ? "border-rose-300 ring-2 ring-rose-100"
                    : isHovered
                    ? "border-brand-300 ring-2 ring-brand-50"
                    : "border-slate-200",
                  onSelectAnnotation ? "cursor-pointer hover:border-brand-200" : "",
                ].join(" ")}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={badgeClass("type")}>
                        {reviewAnnotationTypeLabels[annotation.annotation_type]}
                      </span>
                      <span className={badgeClass(annotation.status)}>
                        {reviewAnnotationStatusLabels[annotation.status]}
                      </span>
                      {annotation.is_mandatory_change && (
                        <span className={badgeClass("mandatory")}>Mandatory</span>
                      )}
                      {(annotation.category || annotation.comment_category) && (
                        <span className={badgeClass("metadata")}>
                          {annotation.category || annotation.comment_category}
                        </span>
                      )}
                      {annotation.severity && (
                        <span className={badgeClass("metadata")}>{annotation.severity}</span>
                      )}
                      {visualLabel && (
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                          {visualLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {annotation.element_reference || "General comment"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {annotation.content_version_label || "Content version"}{" "}
                      {annotation.asset_filename ? `/ ${annotation.asset_filename}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canResolve && annotation.status !== "RESOLVED" && annotation.status !== "DISMISSED" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setResolvingId(annotation.id);
                        }}
                        className={secondaryButtonClass}
                      >
                        Resolve
                      </button>
                    )}
                    {canDismiss && annotation.status !== "DISMISSED" && annotation.status !== "RESOLVED" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setResolvingId(annotation.id);
                        }}
                        className={dangerButtonClass}
                      >
                        Dismiss
                      </button>
                    )}
                    {canReopen && (annotation.status === "RESOLVED" || annotation.status === "DISMISSED") && onReopen && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onReopen(annotation.id);
                        }}
                        className={secondaryButtonClass}
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {annotation.comment_text}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {annotation.reviewer_name ?? `User ${annotation.reviewer_id}`} / {formatDateTime(annotation.created_at)}
                </p>

                {(annotation.resolution_note || annotation.resolved_by_id || annotation.resolved_at) && (
                  <div className="mt-4 rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Resolution
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {annotation.resolution_note || "No resolution note provided."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {annotation.resolved_by_name ?? (annotation.resolved_by_id ? `User ${annotation.resolved_by_id}` : "Not resolved")} / {formatDateTime(annotation.resolved_at)}
                    </p>
                  </div>
                )}

                {resolvingId === annotation.id && (
                  <div
                    className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-slate-700">Resolution Note</span>
                      <textarea
                        value={resolutionNote}
                        onChange={(event) => setResolutionNote(event.target.value)}
                        rows={3}
                        maxLength={5000}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingId(null);
                          setResolutionNote("");
                        }}
                        className={secondaryButtonClass}
                      >
                        Cancel
                      </button>
                      {canDismiss && annotation.status !== "DISMISSED" && annotation.status !== "RESOLVED" && (
                        <button
                          type="button"
                          onClick={() => void handleDismiss(annotation.id)}
                          disabled={isSubmitting}
                          className={dangerButtonClass}
                        >
                          Dismiss
                        </button>
                      )}
                      {canResolve && annotation.status !== "RESOLVED" && annotation.status !== "DISMISSED" && (
                        <button
                          type="button"
                          onClick={() => void handleResolve(annotation.id)}
                          disabled={isSubmitting}
                          className={primaryButtonClass}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
            })}
          </div>
        )}
      </div>
    </SummaryCard>
  );
}

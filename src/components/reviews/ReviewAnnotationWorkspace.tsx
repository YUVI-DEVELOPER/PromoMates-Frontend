import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { downloadAsset } from "../../api/assets";
import {
  createDesignReviewAnnotation,
  getDesignReviewAnnotations,
  reopenDesignReviewAnnotation,
  resolveDesignReviewAnnotation,
} from "../../api/reviewAnnotations";
import type { ViewerAsset } from "../../types/asset";
import type {
  DesignReviewAnnotationCreatePayload,
  ReviewAnnotation,
  ReviewAnnotationCreatePayload,
  ReviewStage,
} from "../../types/reviewAnnotation";
import { getApiErrorMessage } from "../../utils/apiError";
import { ContentViewer } from "../viewer/ContentViewer";
import { ReviewAnnotationsPanel } from "./ReviewAnnotationsPanel";


type AnnotationFilter = "OPEN" | "MANDATORY" | "RESOLVED" | "ALL";


export type ReviewAnnotationSummary = {
  total: number;
  open: number;
  mandatory_open: number;
  resolved: number;
};


export type ReviewAnnotationWorkspaceMode = "readOnly" | "inlineMarkup" | "listOnly" | "fullFormLegacy";


type ReviewAnnotationWorkspaceProps = {
  requestId: string;
  reviewStage: ReviewStage;
  designDraftId?: string | null;
  contentVersionId?: string | null;
  contentWorkspaceId?: number | null;
  workflowTaskId?: number | null;
  taskType?: string | null;
  fileAssetId: number | null;
  fileName: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  canAnnotate: boolean;
  canResolve: boolean;
  canReopen: boolean;
  readOnly: boolean;
  mode?: ReviewAnnotationWorkspaceMode;
  currentUserId?: number | null;
  currentUserName?: string | null;
  initialAnnotations?: ReviewAnnotation[];
  skipInitialFetch?: boolean;
  annotationApiBase?: string;
  title?: string;
  subtitle?: string;
  summaryItems?: Array<{ label: string; value: ReactNode; tone?: "default" | "success" | "warning" }>;
  feedbackContent?: ReactNode;
  actionBar?: ReactNode;
  commentsTitle?: string;
  commentsSubtitle?: ReactNode;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  onAnnotationsChanged?: (summary: ReviewAnnotationSummary, annotations: ReviewAnnotation[]) => void | Promise<void>;
};


const filterButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-100";


function annotationSummary(annotations: ReviewAnnotation[]): ReviewAnnotationSummary {
  const openAnnotations = annotations.filter(
    (annotation) => annotation.status === "OPEN" || annotation.status === "REOPENED",
  );
  return {
    total: annotations.length,
    open: openAnnotations.length,
    mandatory_open: openAnnotations.filter((annotation) => annotation.is_mandatory_change).length,
    resolved: annotations.filter((annotation) => annotation.status === "RESOLVED").length,
  };
}


function filteredAnnotations(annotations: ReviewAnnotation[], filter: AnnotationFilter): ReviewAnnotation[] {
  if (filter === "ALL") {
    return annotations;
  }
  if (filter === "RESOLVED") {
    return annotations.filter((annotation) => annotation.status === "RESOLVED");
  }
  if (filter === "MANDATORY") {
    return annotations.filter(
      (annotation) =>
        annotation.is_mandatory_change &&
        (annotation.status === "OPEN" || annotation.status === "REOPENED"),
    );
  }
  return annotations.filter((annotation) => annotation.status === "OPEN" || annotation.status === "REOPENED");
}


export function ReviewAnnotationWorkspace(props: ReviewAnnotationWorkspaceProps) {
  const {
    requestId,
    reviewStage,
    designDraftId,
    contentVersionId,
    contentWorkspaceId,
    workflowTaskId,
    taskType,
    fileAssetId,
    fileName,
    fileMimeType = "",
    fileSizeBytes = 0,
    canAnnotate,
    canResolve,
    canReopen,
    readOnly,
    mode = "fullFormLegacy",
    currentUserId = null,
    currentUserName = null,
    initialAnnotations = [],
    skipInitialFetch = false,
    title = "Therapy Lead Design Review",
    subtitle = "Review the uploaded design draft against the approved medical content and submitted design brief.",
    summaryItems,
    feedbackContent,
    actionBar,
    commentsTitle = "Design Review Comments",
    commentsSubtitle = "Therapy Lead comments connected to this design review stage.",
    emptyStateTitle = "No review comments yet",
    emptyStateDescription = "Add comments before completing this review stage.",
    onAnnotationsChanged,
  } = props;
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>(initialAnnotations);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AnnotationFilter>("OPEN");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const asset = useMemo<ViewerAsset | null>(() => {
    if (!fileAssetId) {
      return null;
    }
    return {
      id: fileAssetId,
      original_filename: fileName ?? "Design draft",
      mime_type: fileMimeType ?? "",
      file_size: fileSizeBytes ?? 0,
      download_url: `/assets/${fileAssetId}/download`,
    };
  }, [fileAssetId, fileMimeType, fileName, fileSizeBytes]);

  const summary = useMemo(() => annotationSummary(annotations), [annotations]);
  const visibleAnnotations = useMemo(() => filteredAnnotations(annotations, filter), [annotations, filter]);
  const isReadOnlyMode = mode === "readOnly";
  const isInlineMarkupMode = mode === "inlineMarkup";
  const isListOnlyMode = mode === "listOnly";
  const canCreateAnnotations = !readOnly && canAnnotate && (mode === "inlineMarkup" || mode === "fullFormLegacy");
  const canResolveAnnotations = !readOnly && canResolve;
  const canReopenAnnotations = !readOnly && canReopen;

  const syncAnnotations = useCallback((nextAnnotations: ReviewAnnotation[]) => {
    setAnnotations(nextAnnotations);
    const nextSummary = annotationSummary(nextAnnotations);
    void onAnnotationsChanged?.(nextSummary, nextAnnotations);
  }, [onAnnotationsChanged]);

  const updateAnnotations = useCallback((updater: (current: ReviewAnnotation[]) => ReviewAnnotation[]) => {
    setAnnotations((current) => {
      const nextAnnotations = updater(current);
      const nextSummary = annotationSummary(nextAnnotations);
      void onAnnotationsChanged?.(nextSummary, nextAnnotations);
      return nextAnnotations;
    });
  }, [onAnnotationsChanged]);

  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  const loadAnnotations = useCallback(async (signal?: AbortSignal) => {
    if (reviewStage !== "THERAPY_DESIGN_REVIEW") {
      setAnnotations([]);
      return;
    }
    if (skipInitialFetch) {
      syncAnnotations(initialAnnotations);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await getDesignReviewAnnotations(requestId, {
        design_draft_id: designDraftId ?? null,
        page_size: 100,
      }, signal);
      if (signal?.aborted) {
        return;
      }
      syncAnnotations(response.items);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      setAnnotations([]);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [designDraftId, initialAnnotations, requestId, reviewStage, skipInitialFetch, syncAnnotations]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAnnotations(controller.signal);
    return () => controller.abort();
  }, [loadAnnotations]);

  useEffect(() => {
    if (!selectedAnnotationId) {
      return;
    }
    const stillVisible = annotations.some((annotation) => annotation.id === selectedAnnotationId);
    if (!stillVisible) {
      setSelectedAnnotationId(null);
    }
  }, [annotations, selectedAnnotationId]);

  async function handleCreateAnnotation(payload: ReviewAnnotationCreatePayload) {
    const now = new Date().toISOString();
    const optimisticId = `pending-${Date.now()}`;
    const optimisticAnnotation: ReviewAnnotation = {
      id: optimisticId,
      request_id: requestId,
      content_workspace_id: contentWorkspaceId ?? null,
      document_id: contentWorkspaceId ?? null,
      content_version_id: contentVersionId ?? payload.content_version_id ?? null,
      design_draft_id: designDraftId ?? payload.design_draft_id ?? null,
      file_asset_id: payload.file_asset_id ?? payload.asset_id ?? fileAssetId,
      asset_id: payload.asset_id ?? payload.file_asset_id ?? fileAssetId,
      review_task_id: null,
      workflow_task_id: workflowTaskId ?? null,
      review_stage: reviewStage,
      task_type: taskType ?? "THERAPY_DESIGN_REVIEW",
      author_id: currentUserId ?? 0,
      reviewer_id: currentUserId ?? 0,
      assigned_to_id: null,
      stage_code: reviewStage,
      category: payload.category ?? payload.comment_category ?? "DESIGN",
      comment_category: payload.comment_category ?? payload.category ?? "DESIGN",
      severity: payload.severity ?? "MEDIUM",
      annotation_type: payload.annotation_type,
      element_reference: payload.element_reference ?? null,
      comment_text: payload.comment_text,
      is_mandatory: payload.is_mandatory ?? payload.is_mandatory_change,
      is_mandatory_change: payload.is_mandatory ?? payload.is_mandatory_change,
      anchor_type: payload.anchor_type ?? null,
      page_number: payload.page_number ?? null,
      x: payload.x ?? null,
      y: payload.y ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      normalized: payload.normalized ?? true,
      timestamp_seconds: payload.timestamp_seconds ?? null,
      selected_text: payload.selected_text ?? null,
      shape_data: payload.shape_data ?? null,
      render_context: payload.render_context ?? null,
      preview_source: payload.preview_source ?? null,
      status: "OPEN",
      resolved_by_id: null,
      resolved_at: null,
      resolution_note: null,
      created_at: now,
      updated_at: now,
      reviewer_name: currentUserName ?? "Saving...",
      resolved_by_name: null,
      content_version_label: "Design draft",
      asset_filename: fileName,
    };
    const designPayload: DesignReviewAnnotationCreatePayload = {
      design_draft_id: designDraftId ?? payload.design_draft_id ?? null,
      file_asset_id: payload.file_asset_id ?? payload.asset_id ?? fileAssetId,
      content_version_id: contentVersionId ?? payload.content_version_id ?? null,
      page_number: payload.page_number ?? null,
      x: payload.x ?? null,
      y: payload.y ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      selected_text: payload.selected_text ?? null,
      comment_text: payload.comment_text,
      category: payload.category ?? payload.comment_category ?? "DESIGN",
      severity: payload.severity ?? "MEDIUM",
      is_mandatory: payload.is_mandatory ?? payload.is_mandatory_change,
      annotation_type: payload.annotation_type,
      element_reference: payload.element_reference ?? null,
      anchor_type: payload.anchor_type ?? null,
      normalized: payload.normalized ?? true,
      timestamp_seconds: payload.timestamp_seconds ?? null,
      shape_data: payload.shape_data ?? null,
      render_context: payload.render_context ?? null,
      preview_source: payload.preview_source ?? null,
    };
    setSelectedAnnotationId(optimisticId);
    updateAnnotations((current) => [optimisticAnnotation, ...current]);
    try {
      const createdAnnotation = await createDesignReviewAnnotation(requestId, designPayload);
      setSelectedAnnotationId(createdAnnotation.id);
      updateAnnotations((current) => [
        createdAnnotation,
        ...current.filter((annotation) => annotation.id !== optimisticId && annotation.id !== createdAnnotation.id),
      ]);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      updateAnnotations((current) => current.filter((annotation) => annotation.id !== optimisticId));
      throw new Error(message);
    }
  }

  async function handleResolveAnnotation(annotationId: string) {
    try {
      await resolveDesignReviewAnnotation(requestId, annotationId);
      await loadAnnotations();
    } catch (error) {
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      throw new Error(message);
    }
  }

  async function handleReopenAnnotation(annotationId: string) {
    try {
      await reopenDesignReviewAnnotation(requestId, annotationId);
      await loadAnnotations();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  const filters: Array<{ key: AnnotationFilter; label: string; count: number }> = [
    { key: "OPEN", label: "Open", count: summary.open },
    { key: "MANDATORY", label: "Mandatory", count: summary.mandatory_open },
    { key: "RESOLVED", label: "Resolved", count: summary.resolved },
    { key: "ALL", label: "All", count: summary.total },
  ];
  const defaultSummaryItems = [
    { label: "Total comments", value: summary.total },
    { label: "Open comments", value: summary.open, tone: "success" as const },
    { label: "Mandatory comments", value: summary.mandatory_open, tone: "warning" as const },
    { label: "Resolved comments", value: summary.resolved },
  ];
  const renderedSummaryItems = summaryItems ?? defaultSummaryItems;
  const summaryToneClass = {
    default: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
          <p className="mt-1 break-words text-xs font-medium text-slate-500">
            {fileName ?? "Uploaded design draft"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-4">
          {renderedSummaryItems.map((item) => (
            <span
              key={item.label}
              className={[
                "rounded-md border px-3 py-2 font-semibold",
                summaryToneClass[item.tone ?? "default"],
              ].join(" ")}
            >
              <span className="block text-[10px] uppercase tracking-wide opacity-70">{item.label}</span>
              <span className="mt-1 block text-sm">{item.value}</span>
            </span>
          ))}
        </div>
      </div>

      {feedbackContent}

      <div className="flex flex-wrap gap-2">
        {filters.map((option) => {
          const isActive = option.key === filter;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={[
                filterButtonClass,
                isActive
                  ? "border-brand-700 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {option.label} ({option.count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <ContentViewer
          asset={asset}
          contentVersion={null}
          contentVersionId={contentVersionId ?? null}
          contentVersionLabel="Design draft"
          annotations={visibleAnnotations}
          selectedAnnotationId={selectedAnnotationId}
          hoveredAnnotationId={hoveredAnnotationId}
          canAnnotate={canCreateAnnotations}
          allowAnnotationWithoutContentVersion
          showReviewMetadataFields
          annotationComposerMode={isInlineMarkupMode ? "inline" : "panel"}
          showAnnotationToolbar={mode === "inlineMarkup" || mode === "fullFormLegacy"}
          defaultCreatePayload={{
            request_id: requestId,
            content_workspace_id: contentWorkspaceId ?? null,
            document_id: contentWorkspaceId ?? null,
            content_version_id: contentVersionId ?? null,
            design_draft_id: designDraftId ?? null,
            file_asset_id: fileAssetId,
            asset_id: fileAssetId,
            workflow_task_id: workflowTaskId ?? null,
            review_stage: reviewStage,
            task_type: taskType ?? "THERAPY_DESIGN_REVIEW",
            annotation_type: "DESIGN",
            category: "DESIGN",
            comment_category: "DESIGN",
            severity: "MEDIUM",
          }}
          onCreateAnnotation={handleCreateAnnotation}
          onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
          onDownload={(viewerAsset) => void downloadAsset(viewerAsset.id, viewerAsset.original_filename)}
          title="Uploaded Design Draft Preview"
          subtitle={
            isInlineMarkupMode
              ? "Use pin, box, or general comments to mark the exact issues for the next revision."
              : "Stage-specific annotations are saved to Therapy Lead Design Review."
          }
        />

        <ReviewAnnotationsPanel
          annotations={visibleAnnotations}
          isLoading={isLoading}
          errorMessage={errorMessage}
          title={commentsTitle}
          subtitle={commentsSubtitle}
          emptyStateTitle={emptyStateTitle}
          emptyStateDescription={emptyStateDescription}
          selectedAnnotationId={selectedAnnotationId}
          hoveredAnnotationId={hoveredAnnotationId}
          canAdd={mode === "fullFormLegacy" && canCreateAnnotations}
          canResolve={!isReadOnlyMode && canResolveAnnotations}
          canReopen={!isReadOnlyMode && canReopenAnnotations}
          showReviewMetadataFields
          defaultCreatePayload={{
            request_id: requestId,
            content_workspace_id: contentWorkspaceId ?? null,
            document_id: contentWorkspaceId ?? null,
            content_version_id: contentVersionId ?? null,
            design_draft_id: designDraftId ?? null,
            file_asset_id: fileAssetId,
            asset_id: fileAssetId,
            workflow_task_id: workflowTaskId ?? null,
            review_stage: reviewStage,
            task_type: taskType ?? "THERAPY_DESIGN_REVIEW",
            annotation_type: "DESIGN",
            category: "DESIGN",
            comment_category: "DESIGN",
            severity: "MEDIUM",
            is_mandatory_change: false,
          }}
          onHoverAnnotation={(annotation) => setHoveredAnnotationId(annotation?.id ?? null)}
          onSelectAnnotation={(annotation) => setSelectedAnnotationId(annotation.id)}
          onCreate={mode === "fullFormLegacy" ? handleCreateAnnotation : undefined}
          onResolve={handleResolveAnnotation}
          onReopen={handleReopenAnnotation}
        />
      </div>

      {actionBar}
    </section>
  );
}

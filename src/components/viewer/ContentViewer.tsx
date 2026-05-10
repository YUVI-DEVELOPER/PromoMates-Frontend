import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import {
  generateAssetPreview,
  getAssetPreviewMeta,
  getAssetViewerSourceArrayBuffer,
  getAssetViewerSourceBlob,
} from "../../api/assets";
import type { AssetPreview, ViewerAsset } from "../../types/asset";
import type { ContentVersion } from "../../types/contentVersion";
import type {
  ReviewAnnotation,
  ReviewAnnotationCreatePayload,
  ReviewAnnotationSeverity,
  ReviewAnnotationType,
} from "../../types/reviewAnnotation";
import {
  reviewAnnotationTypeLabels,
  reviewAnnotationTypeOptions,
} from "../../types/reviewAnnotation";
import { getApiErrorMessage } from "../../utils/apiError";
import { PdfViewer } from "./PdfViewer";
import { ImageViewer } from "./ImageViewer";
import { VideoViewer } from "./VideoViewer";
import { PreviewFallback } from "./PreviewFallback";
import type { PendingAnnotationAnchor, ViewerMode } from "./types";


type AnnotationComposerMode = "panel" | "inline";


type ContentViewerProps = {
  asset: ViewerAsset | null;
  contentVersion: ContentVersion | null;
  contentVersionId?: string | null;
  contentVersionLabel?: string | null;
  annotations: ReviewAnnotation[];
  selectedAnnotationId?: string | null;
  hoveredAnnotationId?: string | null;
  canAnnotate?: boolean;
  allowAnnotationWithoutContentVersion?: boolean;
  showReviewMetadataFields?: boolean;
  categoryOptions?: Array<{ value: string; label: string }>;
  severityOptions?: Array<{ value: ReviewAnnotationSeverity; label: string }>;
  defaultCreatePayload?: Partial<ReviewAnnotationCreatePayload>;
  annotationComposerMode?: AnnotationComposerMode;
  showAnnotationToolbar?: boolean;
  onCreateAnnotation?: (payload: ReviewAnnotationCreatePayload) => Promise<void> | void;
  onSelectAnnotation?: (annotation: ReviewAnnotation) => void;
  onDownload?: (asset: ViewerAsset) => void;
  title?: string;
  subtitle?: string;
};


const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const activeButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-brand-700 bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition focus:outline-none focus:ring-2 focus:ring-brand-100";

const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const defaultCategoryOptions: Array<{ value: string; label: string }> = [
  { value: "DESIGN", label: "Design" },
  { value: "OTHER", label: "Other" },
];

const defaultSeverityOptions: Array<{ value: ReviewAnnotationSeverity; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];


function formatTimestamp(value: number): string {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}


function isPreviewRenderable(preview: AssetPreview | null): boolean {
  return Boolean(preview && preview.preview_status === "READY" && preview.preview_type !== "UNSUPPORTED");
}


function isDocumentPreview(preview: AssetPreview | null): boolean {
  return preview?.preview_type === "PDF" || preview?.preview_type === "IMAGE";
}


function visualAnnotationsForAsset(
  annotations: ReviewAnnotation[],
  contentVersionId: string | null,
  asset: ViewerAsset | null,
): ReviewAnnotation[] {
  return annotations.filter((annotation) => {
    const sameContentVersion = contentVersionId ? annotation.content_version_id === contentVersionId : true;
    const annotationAssetId = annotation.file_asset_id ?? annotation.asset_id;
    const sameAsset = annotationAssetId && asset ? annotationAssetId === asset.id : true;
    return sameContentVersion && sameAsset;
  });
}


function annotationAnchorSummary(anchor: PendingAnnotationAnchor | null): string {
  if (!anchor) {
    return "General comment";
  }
  if (anchor.anchor_type === "DOCUMENT_PIN") {
    return anchor.page_number ? `Pin on page ${anchor.page_number}` : "Pin comment";
  }
  if (anchor.anchor_type === "DOCUMENT_BOX") {
    return anchor.page_number ? `Box on page ${anchor.page_number}` : "Box comment";
  }
  if (anchor.anchor_type === "VIDEO_TIMESTAMP") {
    return `Timestamp ${formatTimestamp(anchor.timestamp_seconds ?? 0)}`;
  }
  return "General comment";
}

function clampPercent(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultInlinePanelPosition(anchor: PendingAnnotationAnchor): { left: number; top: number } {
  if (anchor.anchor_type === "DOCUMENT_PIN") {
    return {
      left: clampPercent((anchor.x ?? 0.5) + 0.04, 0.04, 0.68),
      top: clampPercent((anchor.y ?? 0.5) + 0.04, 0.04, 0.72),
    };
  }
  if (anchor.anchor_type === "DOCUMENT_BOX") {
    return {
      left: clampPercent((anchor.x ?? 0.4) + (anchor.width ?? 0.12) + 0.02, 0.04, 0.68),
      top: clampPercent(anchor.y ?? 0.2, 0.04, 0.72),
    };
  }
  return {
    left: 0.6,
    top: 0.08,
  };
}


export function ContentViewer({
  asset,
  contentVersion,
  contentVersionId,
  contentVersionLabel,
  annotations,
  selectedAnnotationId,
  hoveredAnnotationId,
  canAnnotate = false,
  allowAnnotationWithoutContentVersion = false,
  showReviewMetadataFields = false,
  categoryOptions = defaultCategoryOptions,
  severityOptions = defaultSeverityOptions,
  defaultCreatePayload = {},
  annotationComposerMode = "panel",
  showAnnotationToolbar,
  onCreateAnnotation,
  onSelectAnnotation,
  onDownload,
  title = "Preview & Annotations",
  subtitle = "Visual preview is tied to the selected content version.",
}: ContentViewerProps) {
  const [preview, setPreview] = useState<AssetPreview | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRetryingPreview, setIsRetryingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewerMode>("idle");
  const [zoom, setZoom] = useState(1);
  const [pendingAnchor, setPendingAnchor] = useState<PendingAnnotationAnchor | null>(null);
  const [annotationType, setAnnotationType] = useState<ReviewAnnotationType>(defaultCreatePayload.annotation_type ?? "GENERAL");
  const [commentCategory, setCommentCategory] = useState(defaultCreatePayload.category ?? categoryOptions[0]?.value ?? "DESIGN");
  const [severity, setSeverity] = useState<ReviewAnnotationSeverity>(defaultCreatePayload.severity ?? "MEDIUM");
  const [elementReference, setElementReference] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isMandatoryChange, setIsMandatoryChange] = useState(Boolean(defaultCreatePayload.is_mandatory_change));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [inlinePanelPosition, setInlinePanelPosition] = useState<{ left: number; top: number } | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const resolvedContentVersionId = contentVersion?.id ?? contentVersionId ?? null;
  const resolvedContentVersionLabel =
    contentVersion?.version_label ||
    (contentVersion ? `V${contentVersion.version_number}` : contentVersionLabel);
  const viewerAnnotations = useMemo(
    () => visualAnnotationsForAsset(annotations, resolvedContentVersionId, asset),
    [annotations, asset, resolvedContentVersionId],
  );

  const resetComposer = useCallback(() => {
    setPendingAnchor(null);
    setMode("idle");
    setAnnotationType(defaultCreatePayload.annotation_type ?? "GENERAL");
    setCommentCategory(defaultCreatePayload.category ?? categoryOptions[0]?.value ?? "DESIGN");
    setSeverity(defaultCreatePayload.severity ?? "MEDIUM");
    setElementReference("");
    setCommentText("");
    setIsMandatoryChange(Boolean(defaultCreatePayload.is_mandatory_change));
    setInlinePanelPosition(null);
    setFormError(null);
  }, [
    categoryOptions,
    defaultCreatePayload.annotation_type,
    defaultCreatePayload.category,
    defaultCreatePayload.is_mandatory_change,
    defaultCreatePayload.severity,
  ]);

  const loadSource = useCallback(async (nextPreview: AssetPreview) => {
    if (!asset || nextPreview.preview_status !== "READY") {
      return;
    }

    setPdfData(null);
    setSourceUrl(null);

    if (nextPreview.preview_type === "PDF") {
      const buffer = await getAssetViewerSourceArrayBuffer(asset.id);
      setPdfData(buffer);
      return;
    }

    if (nextPreview.preview_type === "IMAGE" || nextPreview.preview_type === "VIDEO") {
      const blob = await getAssetViewerSourceBlob(asset.id);
      setSourceUrl(window.URL.createObjectURL(blob));
    }
  }, [asset]);

  const loadPreview = useCallback(async (forceGenerate = false) => {
    if (!asset) {
      setPreview(null);
      setSourceUrl(null);
      setPdfData(null);
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      let nextPreview = forceGenerate
        ? await generateAssetPreview(asset.id)
        : await getAssetPreviewMeta(asset.id);

      if (nextPreview.preview_status === "PENDING") {
        nextPreview = await generateAssetPreview(asset.id);
      }

      setPreview(nextPreview);
      if (isPreviewRenderable(nextPreview)) {
        await loadSource(nextPreview);
      }
    } catch (error) {
      setPreview(null);
      setPreviewError(getApiErrorMessage(error));
    } finally {
      setIsLoadingPreview(false);
    }
  }, [asset, loadSource]);

  useEffect(() => {
    void loadPreview(false);
  }, [loadPreview]);

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        window.URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  useEffect(() => {
    resetComposer();
  }, [annotationComposerMode, resetComposer]);

  function beginGeneralAnnotation() {
    if (!canAnnotate) {
      return;
    }
    const nextAnchor: PendingAnnotationAnchor = {
      anchor_type: "GENERAL",
      element_reference: "General comment",
    };
    setMode("idle");
    setPendingAnchor(nextAnchor);
    setInlinePanelPosition(defaultInlinePanelPosition(nextAnchor));
    setElementReference("General comment");
    setFormError(null);
  }

  function handleCreateAnchor(anchor: PendingAnnotationAnchor) {
    if (!canAnnotate) {
      return;
    }
    setPendingAnchor(anchor);
    setInlinePanelPosition(defaultInlinePanelPosition(anchor));
    setElementReference(anchor.element_reference ?? "");
    setMode("idle");
    setFormError(null);
  }

  function beginVideoTimestamp() {
    const timestamp = currentVideoTime || 0;
    handleCreateAnchor({
      anchor_type: "VIDEO_TIMESTAMP",
      timestamp_seconds: timestamp,
      element_reference: `Timestamp ${formatTimestamp(timestamp)}`,
    });
  }

  async function handleRetryPreview() {
    setIsRetryingPreview(true);
    try {
      await loadPreview(true);
    } finally {
      setIsRetryingPreview(false);
    }
  }

  async function handleSubmitAnnotation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingAnchor || !onCreateAnnotation) {
      return;
    }

    if (!resolvedContentVersionId && !allowAnnotationWithoutContentVersion) {
      setFormError("A content version is required before saving annotations.");
      return;
    }

    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      setFormError("Comment text is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const createPayload: ReviewAnnotationCreatePayload = {
      ...defaultCreatePayload,
      content_version_id: resolvedContentVersionId,
      asset_id: pendingAnchor.anchor_type === "GENERAL" ? defaultCreatePayload.asset_id ?? null : asset?.id ?? null,
      file_asset_id: pendingAnchor.anchor_type === "GENERAL" ? defaultCreatePayload.file_asset_id ?? null : asset?.id ?? null,
      anchor_type: pendingAnchor.anchor_type,
      page_number: pendingAnchor.page_number ?? null,
      x: pendingAnchor.x ?? null,
      y: pendingAnchor.y ?? null,
      width: pendingAnchor.width ?? null,
      height: pendingAnchor.height ?? null,
      timestamp_seconds: pendingAnchor.timestamp_seconds ?? null,
      selected_text: null,
      shape_data: null,
      render_context: {
        preview_type: preview?.preview_type ?? null,
        zoom,
      },
      preview_source: preview?.viewer_source_url ?? null,
      annotation_type: annotationComposerMode === "inline"
        ? defaultCreatePayload.annotation_type ?? "DESIGN"
        : annotationType,
      category: showReviewMetadataFields
        ? commentCategory
        : defaultCreatePayload.category ?? null,
      comment_category: showReviewMetadataFields
        ? commentCategory
        : defaultCreatePayload.comment_category ?? null,
      severity: showReviewMetadataFields
        ? severity
        : defaultCreatePayload.severity ?? null,
      element_reference: elementReference.trim() || pendingAnchor.element_reference || null,
      comment_text: trimmedComment,
      is_mandatory: isMandatoryChange,
      is_mandatory_change: isMandatoryChange,
    };

    try {
      const createResult = onCreateAnnotation(createPayload);
      if (annotationComposerMode === "inline") {
        resetComposer();
        setIsSubmitting(false);
        void Promise.resolve(createResult).catch((error) => {
          setFormError(error instanceof Error ? error.message : "Could not save annotation.");
        });
        return;
      }
      await createResult;
      resetComposer();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save annotation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canCreateVisual = canAnnotate && Boolean(onCreateAnnotation && asset && (resolvedContentVersionId || allowAnnotationWithoutContentVersion));
  const shouldShowToolbar = showAnnotationToolbar ?? canCreateVisual;
  const isPdfReady = preview?.preview_type === "PDF" && pdfData;
  const isImageReady = preview?.preview_type === "IMAGE" && sourceUrl;
  const isVideoReady = preview?.preview_type === "VIDEO" && sourceUrl;
  const isInlineComposer = annotationComposerMode === "inline";
  const showLegacyComposer = !isInlineComposer && pendingAnchor;
  const showInlineFloatingComposer = isInlineComposer && pendingAnchor;

  function renderComposerFields(compact: boolean): ReactNode {
    return (
      <>
        {(formError || !canCreateVisual) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError || "Annotation creation is not available for this preview."}
          </div>
        )}

        {showReviewMetadataFields && (
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
        )}

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-slate-700">Comment</span>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows={compact ? 4 : 3}
            maxLength={5000}
            placeholder="Describe the issue the designer should fix."
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isMandatoryChange}
            onChange={(event) => setIsMandatoryChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
          />
          Mandatory change
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={resetComposer} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !canCreateVisual} className={primaryButtonClass}>
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </>
    );
  }

  function beginInlinePanelDrag(event: ReactMouseEvent<HTMLDivElement>) {
    const panel = event.currentTarget.parentElement;
    const container = panel?.parentElement;
    if (!(panel instanceof HTMLDivElement) || !(container instanceof HTMLDivElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const panelRect = panel.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offsetX = event.clientX - panelRect.left;
    const offsetY = event.clientY - panelRect.top;

    function handleMouseMove(moveEvent: MouseEvent) {
      const nextLeft = Math.min(
        Math.max(0, moveEvent.clientX - containerRect.left - offsetX),
        Math.max(0, containerRect.width - panelRect.width),
      );
      const nextTop = Math.min(
        Math.max(0, moveEvent.clientY - containerRect.top - offsetY),
        Math.max(0, containerRect.height - panelRect.height),
      );
      setInlinePanelPosition({
        left: containerRect.width > 0 ? nextLeft / containerRect.width : 0.04,
        top: containerRect.height > 0 ? nextTop / containerRect.height : 0.04,
      });
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function renderInlineFloatingComposer(): ReactNode {
    if (!showInlineFloatingComposer || !pendingAnchor || !inlinePanelPosition) {
      return null;
    }

    return (
      <div
        className="absolute z-30 w-[320px] max-w-[min(320px,calc(100%-1rem))] rounded-md border border-slate-200 bg-white p-3 shadow-xl"
        style={{
          left: `${clampPercent(inlinePanelPosition.left, 0.02, 0.72) * 100}%`,
          top: `${clampPercent(inlinePanelPosition.top, 0.02, 0.76) * 100}%`,
        }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <form className="space-y-3" onSubmit={handleSubmitAnnotation}>
          <div
            className="cursor-move rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            onMouseDown={beginInlinePanelDrag}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {pendingAnchor.anchor_type === "DOCUMENT_BOX"
                ? "Box comment"
                : pendingAnchor.anchor_type === "DOCUMENT_PIN"
                ? "Pin comment"
                : "General comment"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {annotationAnchorSummary(pendingAnchor)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Drag this comment card anywhere on the preview.</p>
          </div>
          {renderComposerFields(false)}
        </form>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
            {asset && (
              <p className="mt-1 break-words text-xs font-medium text-slate-500">
                {asset.original_filename}
                {resolvedContentVersionLabel ? ` / ${resolvedContentVersionLabel}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isDocumentPreview(preview) && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(2))))}
                  className={secondaryButtonClass}
                >
                  -
                </button>
                <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.min(2.5, Number((current + 0.1).toFixed(2))))}
                  className={secondaryButtonClass}
                >
                  +
                </button>
              </>
            )}
            {asset && onDownload && (
              <button type="button" onClick={() => onDownload(asset)} className={secondaryButtonClass}>
                Download
              </button>
            )}
          </div>
        </div>

        {canCreateVisual && shouldShowToolbar && (
          <div className="mt-4 flex flex-wrap gap-2">
            {isDocumentPreview(preview) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAnchor(null);
                    setMode((current) => (current === "pin" ? "idle" : "pin"));
                  }}
                  className={mode === "pin" ? activeButtonClass : secondaryButtonClass}
                >
                  Pin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAnchor(null);
                    setMode((current) => (current === "box" ? "idle" : "box"));
                  }}
                  className={mode === "box" ? activeButtonClass : secondaryButtonClass}
                >
                  Box
                </button>
              </>
            )}
            {preview?.preview_type === "VIDEO" && (
              <button type="button" onClick={beginVideoTimestamp} className={secondaryButtonClass}>
                Timestamp
              </button>
            )}
            <button type="button" onClick={beginGeneralAnnotation} className={secondaryButtonClass}>
              General
            </button>
          </div>
        )}

        {showLegacyComposer && (
          <form onSubmit={handleSubmitAnnotation} className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            {(formError || !canCreateVisual) && (
              <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError || "Annotation creation is not available for this preview."}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[minmax(160px,200px)_minmax(0,1fr)]">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Type</span>
                <select
                  value={annotationType}
                  onChange={(event) => setAnnotationType(event.target.value as ReviewAnnotationType)}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  {reviewAnnotationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {reviewAnnotationTypeLabels[option.value]}
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
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>

            {showReviewMetadataFields && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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

            <label className="mt-3 grid gap-1 text-sm">
              <span className="font-semibold text-slate-700">Comment</span>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={3}
                maxLength={5000}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isMandatoryChange}
                  onChange={(event) => setIsMandatoryChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100"
                />
                Mandatory change
              </label>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button type="button" onClick={resetComposer} className={secondaryButtonClass}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || !canCreateVisual} className={primaryButtonClass}>
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div ref={previewStageRef} className="relative p-4">
        {!asset ? (
          <PreviewFallback asset={null} preview={null} errorMessage="No file is attached to this content version." />
        ) : isLoadingPreview ? (
          <div className="h-96 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
        ) : previewError || !isPreviewRenderable(preview) ? (
          <PreviewFallback
            asset={asset}
            preview={preview}
            errorMessage={previewError}
            onDownload={onDownload}
            onRetry={handleRetryPreview}
            isRetrying={isRetryingPreview}
          />
        ) : isPdfReady ? (
          <PdfViewer
            data={pdfData}
            annotations={viewerAnnotations}
            selectedAnnotationId={selectedAnnotationId}
            hoveredAnnotationId={hoveredAnnotationId}
            mode={mode}
            zoom={zoom}
            pendingAnchor={showInlineFloatingComposer ? pendingAnchor : null}
            onSelectAnnotation={onSelectAnnotation}
            onCreateAnchor={handleCreateAnchor}
          />
        ) : isImageReady ? (
          <ImageViewer
            sourceUrl={sourceUrl}
            annotations={viewerAnnotations}
            selectedAnnotationId={selectedAnnotationId}
            hoveredAnnotationId={hoveredAnnotationId}
            mode={mode}
            zoom={zoom}
            pendingAnchor={showInlineFloatingComposer ? pendingAnchor : null}
            onSelectAnnotation={onSelectAnnotation}
            onCreateAnchor={handleCreateAnchor}
          />
        ) : isVideoReady ? (
          <VideoViewer
            sourceUrl={sourceUrl}
            annotations={viewerAnnotations}
            selectedAnnotationId={selectedAnnotationId}
            durationSeconds={preview?.duration_seconds}
            onSelectAnnotation={onSelectAnnotation}
            onTimeChange={setCurrentVideoTime}
          />
        ) : (
          <PreviewFallback
            asset={asset}
            preview={preview}
            errorMessage="Preview source could not be loaded."
            onDownload={onDownload}
            onRetry={handleRetryPreview}
            isRetrying={isRetryingPreview}
          />
        )}

        {renderInlineFloatingComposer()}
      </div>
    </section>
  );
}

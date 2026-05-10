import { useState, type MouseEvent } from "react";

import type { ReviewAnnotation } from "../../types/reviewAnnotation";
import type { AnnotationOverlayProps, PendingAnnotationAnchor } from "./types";


type DraftBox = {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};


function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}


function pointerPosition(event: MouseEvent<HTMLElement>): { x: number; y: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height),
  };
}


function annotationLabel(annotation: ReviewAnnotation): string {
  if (annotation.anchor_type === "DOCUMENT_BOX") {
    return "Box annotation";
  }
  if (annotation.anchor_type === "DOCUMENT_PIN") {
    return "Pin annotation";
  }
  if (annotation.anchor_type === "TEXT_SELECTION") {
    return "Text selection";
  }
  return "Annotation";
}


function hasDocumentAnchor(annotation: ReviewAnnotation, pageNumber: number): boolean {
  return (
    (annotation.anchor_type === "DOCUMENT_PIN" ||
      annotation.anchor_type === "DOCUMENT_BOX" ||
      annotation.anchor_type === "TEXT_SELECTION") &&
    annotation.page_number === pageNumber &&
    typeof annotation.x === "number" &&
    typeof annotation.y === "number"
  );
}


export function AnnotationOverlay({
  pageNumber,
  annotations,
  selectedAnnotationId,
  hoveredAnnotationId,
  mode = "idle",
  pendingAnchor,
  onSelectAnnotation,
  onCreateAnchor,
  renderPendingPopover,
}: AnnotationOverlayProps) {
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null);
  const pageAnnotations = annotations.filter((annotation) => hasDocumentAnchor(annotation, pageNumber));
  const pendingAnchorOnPage =
    pendingAnchor &&
    (pendingAnchor.anchor_type === "DOCUMENT_PIN" || pendingAnchor.anchor_type === "DOCUMENT_BOX") &&
    pendingAnchor.page_number === pageNumber
      ? pendingAnchor
      : null;

  function buildBoxAnchor(box: DraftBox): PendingAnnotationAnchor | null {
    if (box.width < 0.01 || box.height < 0.01) {
      return null;
    }

    return {
      anchor_type: "DOCUMENT_BOX",
      page_number: pageNumber,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      element_reference: `Page ${pageNumber} box`,
    };
  }

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (mode !== "pin" || !onCreateAnchor) {
      return;
    }

    const point = pointerPosition(event);
    onCreateAnchor({
      anchor_type: "DOCUMENT_PIN",
      page_number: pageNumber,
      x: point.x,
      y: point.y,
      element_reference: `Page ${pageNumber} pin`,
    });
  }

  function handleMouseDown(event: MouseEvent<HTMLElement>) {
    if (mode !== "box" || !onCreateAnchor) {
      return;
    }

    const point = pointerPosition(event);
    setDraftBox({
      startX: point.x,
      startY: point.y,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
  }

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (mode !== "box" || !draftBox) {
      return;
    }

    const point = pointerPosition(event);
    setDraftBox({
      ...draftBox,
      x: Math.min(draftBox.startX, point.x),
      y: Math.min(draftBox.startY, point.y),
      width: Math.abs(point.x - draftBox.startX),
      height: Math.abs(point.y - draftBox.startY),
    });
  }

  function handleMouseUp() {
    if (mode !== "box" || !draftBox || !onCreateAnchor) {
      setDraftBox(null);
      return;
    }

    const anchor = buildBoxAnchor(draftBox);
    setDraftBox(null);
    if (anchor) {
      onCreateAnchor(anchor);
    }
  }

  return (
    <div
      className={[
        "absolute inset-0 z-10",
        mode === "pin" ? "cursor-crosshair" : mode === "box" ? "cursor-crosshair select-none" : "",
      ].join(" ")}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {pageAnnotations.map((annotation) => {
        const isSelected = annotation.id === selectedAnnotationId;
        const isHovered = annotation.id === hoveredAnnotationId;
        if (annotation.anchor_type === "DOCUMENT_BOX") {
          return (
            <button
              key={annotation.id}
              type="button"
              data-annotation-id={annotation.id}
              aria-label={annotationLabel(annotation)}
              title={annotation.comment_text}
              onClick={(event) => {
                event.stopPropagation();
                onSelectAnnotation?.(annotation);
              }}
              className={[
                "absolute rounded-sm border-2 bg-amber-300/15 transition",
                isSelected
                  ? "border-rose-500 ring-4 ring-rose-200"
                  : isHovered
                  ? "border-brand-500 ring-4 ring-brand-100"
                  : "border-amber-500 hover:border-rose-400",
              ].join(" ")}
              style={{
                left: `${(annotation.x ?? 0) * 100}%`,
                top: `${(annotation.y ?? 0) * 100}%`,
                width: `${(annotation.width ?? 0.04) * 100}%`,
                height: `${(annotation.height ?? 0.04) * 100}%`,
              }}
            />
          );
        }

        return (
          <button
            key={annotation.id}
            type="button"
            data-annotation-id={annotation.id}
            aria-label={annotationLabel(annotation)}
            title={annotation.comment_text}
            onClick={(event) => {
              event.stopPropagation();
              onSelectAnnotation?.(annotation);
            }}
            className={[
              "absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm transition",
              isSelected
                ? "border-rose-500 bg-rose-600 text-white ring-4 ring-rose-200"
                : isHovered
                ? "border-brand-500 bg-brand-600 text-white ring-4 ring-brand-100"
                : "border-white bg-amber-500 text-slate-950 hover:bg-rose-500 hover:text-white",
            ].join(" ")}
            style={{
              left: `${(annotation.x ?? 0) * 100}%`,
              top: `${(annotation.y ?? 0) * 100}%`,
            }}
          >
            {annotation.is_mandatory_change ? "!" : ""}
          </button>
        );
      })}

      {draftBox && (
        <div
          className="absolute rounded-sm border-2 border-dashed border-brand-700 bg-brand-50/30"
          style={{
            left: `${draftBox.x * 100}%`,
            top: `${draftBox.y * 100}%`,
            width: `${draftBox.width * 100}%`,
            height: `${draftBox.height * 100}%`,
          }}
        />
      )}

      {pendingAnchorOnPage?.anchor_type === "DOCUMENT_BOX" && (
        <div
          className="absolute rounded-sm border-2 border-dashed border-brand-700 bg-brand-50/20 shadow-sm"
          style={{
            left: `${(pendingAnchorOnPage.x ?? 0) * 100}%`,
            top: `${(pendingAnchorOnPage.y ?? 0) * 100}%`,
            width: `${(pendingAnchorOnPage.width ?? 0.04) * 100}%`,
            height: `${(pendingAnchorOnPage.height ?? 0.04) * 100}%`,
          }}
        />
      )}

      {pendingAnchorOnPage?.anchor_type === "DOCUMENT_PIN" && (
        <div
          className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brand-700 bg-brand-600 text-[10px] font-bold text-white shadow-sm ring-4 ring-brand-100"
          style={{
            left: `${(pendingAnchorOnPage.x ?? 0) * 100}%`,
            top: `${(pendingAnchorOnPage.y ?? 0) * 100}%`,
          }}
        >
          +
        </div>
      )}

      {pendingAnchorOnPage && renderPendingPopover?.(pendingAnchorOnPage, pageNumber)}
    </div>
  );
}

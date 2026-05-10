import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ReviewAnnotation } from "../../types/reviewAnnotation";
import { AnnotationOverlay } from "./AnnotationOverlay";
import type { PendingAnnotationAnchor, ViewerMode } from "./types";


type ImageViewerProps = {
  sourceUrl: string;
  annotations: ReviewAnnotation[];
  selectedAnnotationId?: string | null;
  hoveredAnnotationId?: string | null;
  mode: ViewerMode;
  zoom: number;
  pendingAnchor?: PendingAnnotationAnchor | null;
  onSelectAnnotation?: (annotation: ReviewAnnotation) => void;
  onCreateAnchor?: (anchor: PendingAnnotationAnchor) => void;
  renderPendingPopover?: (anchor: PendingAnnotationAnchor, pageNumber: number) => ReactNode;
};


export function ImageViewer({
  sourceUrl,
  annotations,
  selectedAnnotationId,
  hoveredAnnotationId,
  mode,
  zoom,
  pendingAnchor,
  onSelectAnnotation,
  onCreateAnchor,
  renderPendingPopover,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 900, height: 620 });
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId);
  const baseWidth = Math.min(naturalSize.width || 900, 980);
  const aspectRatio = naturalSize.width > 0 ? naturalSize.height / naturalSize.width : 0.7;
  const displayWidth = baseWidth * zoom;
  const displayHeight = baseWidth * aspectRatio * zoom;

  useEffect(() => {
    if (selectedAnnotation) {
      const selectedMarker = containerRef.current?.querySelector(`[data-annotation-id="${selectedAnnotation.id}"]`);
      if (selectedMarker instanceof HTMLElement) {
        selectedMarker.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        return;
      }
      wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedAnnotation]);

  return (
    <div ref={containerRef} className="max-h-[72vh] overflow-auto rounded-md bg-slate-100 p-4">
      <div
        ref={wrapperRef}
        className="relative mx-auto overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <img
          src={sourceUrl}
          alt=""
          className="block h-full w-full select-none object-contain"
          draggable={false}
          onLoad={(event) => {
            const image = event.currentTarget;
            setNaturalSize({
              width: image.naturalWidth || 900,
              height: image.naturalHeight || 620,
            });
          }}
        />
        <AnnotationOverlay
          pageNumber={1}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          hoveredAnnotationId={hoveredAnnotationId}
          mode={mode}
          pendingAnchor={pendingAnchor}
          onSelectAnnotation={onSelectAnnotation}
          onCreateAnchor={onCreateAnchor}
          renderPendingPopover={renderPendingPopover}
        />
      </div>
    </div>
  );
}

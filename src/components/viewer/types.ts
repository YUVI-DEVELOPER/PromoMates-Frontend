import type { ReactNode } from "react";

import type { ReviewAnnotation, ReviewAnnotationAnchorType } from "../../types/reviewAnnotation";


export type ViewerMode = "idle" | "pin" | "box";


export type PendingAnnotationAnchor = {
  anchor_type: ReviewAnnotationAnchorType;
  page_number?: number | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  timestamp_seconds?: number | null;
  element_reference?: string | null;
};


export type AnnotationOverlayProps = {
  pageNumber: number;
  annotations: ReviewAnnotation[];
  selectedAnnotationId?: string | null;
  hoveredAnnotationId?: string | null;
  mode?: ViewerMode;
  pendingAnchor?: PendingAnnotationAnchor | null;
  onSelectAnnotation?: (annotation: ReviewAnnotation) => void;
  onCreateAnchor?: (anchor: PendingAnnotationAnchor) => void;
  renderPendingPopover?: (anchor: PendingAnnotationAnchor, pageNumber: number) => ReactNode;
};

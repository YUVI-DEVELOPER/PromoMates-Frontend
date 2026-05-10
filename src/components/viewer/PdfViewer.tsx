import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as pdfjsLib from "pdfjs-dist";

import type { ReviewAnnotation } from "../../types/reviewAnnotation";
import { AnnotationOverlay } from "./AnnotationOverlay";
import type { PendingAnnotationAnchor, ViewerMode } from "./types";


pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
  { type: "module" },
);


type PdfPageProxy = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; canvas: HTMLCanvasElement | null; viewport: unknown }) => {
    promise: Promise<void>;
    cancel: () => void;
  };
};


type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy?: () => Promise<void>;
};


type PdfViewerProps = {
  data: ArrayBuffer;
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


type PdfPageProps = {
  pdf: PdfDocumentProxy;
  pageNumber: number;
  zoom: number;
  annotations: ReviewAnnotation[];
  selectedAnnotationId?: string | null;
  hoveredAnnotationId?: string | null;
  mode: ViewerMode;
  setPageRef: (pageNumber: number, element: HTMLDivElement | null) => void;
  pendingAnchor?: PendingAnnotationAnchor | null;
  onSelectAnnotation?: (annotation: ReviewAnnotation) => void;
  onCreateAnchor?: (anchor: PendingAnnotationAnchor) => void;
  renderPendingPopover?: (anchor: PendingAnnotationAnchor, pageNumber: number) => ReactNode;
};


function selectedPage(annotations: ReviewAnnotation[], selectedAnnotationId?: string | null): number | null {
  if (!selectedAnnotationId) {
    return null;
  }
  const annotation = annotations.find((candidate) => candidate.id === selectedAnnotationId);
  return annotation?.page_number ?? null;
}


function PdfPage({
  pdf,
  pageNumber,
  zoom,
  annotations,
  selectedAnnotationId,
  hoveredAnnotationId,
  mode,
  setPageRef,
  pendingAnchor,
  onSelectAnnotation,
  onCreateAnchor,
  renderPendingPopover,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: { promise: Promise<void>; cancel: () => void } | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      try {
        setRenderError(null);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom });
        const context = canvas.getContext("2d");
        if (!context || isCancelled) {
          return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        setSize({ width: viewport.width, height: viewport.height });
        renderTask = page.render({ canvasContext: context, canvas: null, viewport });
        await renderTask.promise;
      } catch (error) {
        if (!isCancelled) {
          setRenderError(error instanceof Error ? error.message : "Could not render this page.");
        }
      }
    }

    void renderPage();

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf, zoom]);

  return (
    <div
      ref={(element) => setPageRef(pageNumber, element)}
      className="mx-auto"
      style={{ width: size.width || undefined }}
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Page {pageNumber}</span>
        {annotations.some((annotation) => annotation.page_number === pageNumber) && (
          <span>{annotations.filter((annotation) => annotation.page_number === pageNumber).length} comments</span>
        )}
      </div>
      <div
        className="relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
        style={{ width: size.width || undefined, height: size.height || 420 }}
      >
        <canvas ref={canvasRef} className="block" />
        <AnnotationOverlay
          pageNumber={pageNumber}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          hoveredAnnotationId={hoveredAnnotationId}
          mode={mode}
          pendingAnchor={pendingAnchor}
          onSelectAnnotation={onSelectAnnotation}
          onCreateAnchor={onCreateAnchor}
          renderPendingPopover={renderPendingPopover}
        />
        {renderError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-4 text-center text-sm text-rose-700">
            {renderError}
          </div>
        )}
      </div>
    </div>
  );
}


export function PdfViewer({
  data,
  annotations,
  selectedAnnotationId,
  hoveredAnnotationId,
  mode,
  zoom,
  pendingAnchor,
  onSelectAnnotation,
  onCreateAnchor,
  renderPendingPopover,
}: PdfViewerProps) {
  const [pdf, setPdf] = useState<PdfDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement | null>());
  const pageNumbers = useMemo(
    () => Array.from({ length: pdf?.numPages ?? 0 }, (_, index) => index + 1),
    [pdf?.numPages],
  );
  const focusedPage = selectedPage(annotations, selectedAnnotationId);

  useEffect(() => {
    let isCancelled = false;
    let nextPdf: PdfDocumentProxy | null = null;

    async function loadPdf() {
      try {
        setLoadError(null);
        setPdf(null);
        // pdf.js transfers the provided buffer to its worker; keep React state reusable.
        const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
        nextPdf = (await loadingTask.promise) as unknown as PdfDocumentProxy;
        if (!isCancelled) {
          setPdf(nextPdf);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load PDF preview.");
        }
      }
    }

    void loadPdf();

    return () => {
      isCancelled = true;
      void nextPdf?.destroy?.();
    };
  }, [data]);

  useEffect(() => {
    if (!focusedPage) {
      return;
    }
    pageRefs.current.get(focusedPage)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedPage]);

  if (loadError) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {loadError}
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="h-96 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
        <span className="font-semibold text-slate-700">{pdf.numPages} pages</span>
        <select
          value={focusedPage ?? 1}
          onChange={(event) => {
            const pageNumber = Number(event.target.value);
            pageRefs.current.get(pageNumber)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {pageNumbers.map((pageNumber) => (
            <option key={pageNumber} value={pageNumber}>
              Page {pageNumber}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-[72vh] space-y-8 overflow-auto rounded-md bg-slate-100 p-4">
        {pageNumbers.map((pageNumber) => (
          <PdfPage
            key={pageNumber}
            pdf={pdf}
            pageNumber={pageNumber}
            zoom={zoom}
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            hoveredAnnotationId={hoveredAnnotationId}
            mode={mode}
            setPageRef={(page, element) => pageRefs.current.set(page, element)}
            pendingAnchor={pendingAnchor}
            onSelectAnnotation={onSelectAnnotation}
            onCreateAnchor={onCreateAnchor}
            renderPendingPopover={renderPendingPopover}
          />
        ))}
      </div>
    </div>
  );
}

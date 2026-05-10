import { useEffect, useMemo, useRef, useState } from "react";

import type { ReviewAnnotation } from "../../types/reviewAnnotation";


type VideoViewerProps = {
  sourceUrl: string;
  annotations: ReviewAnnotation[];
  selectedAnnotationId?: string | null;
  durationSeconds?: number | null;
  onSelectAnnotation?: (annotation: ReviewAnnotation) => void;
  onTimeChange?: (timeSeconds: number) => void;
};


function formatTimestamp(value: number | null | undefined): string {
  const seconds = Math.max(0, Math.floor(value ?? 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}


export function VideoViewer({
  sourceUrl,
  annotations,
  selectedAnnotationId,
  durationSeconds,
  onSelectAnnotation,
  onTimeChange,
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(durationSeconds ?? null);
  const timestampAnnotations = useMemo(
    () =>
      annotations
        .filter(
          (annotation) =>
            annotation.anchor_type === "VIDEO_TIMESTAMP" &&
            typeof annotation.timestamp_seconds === "number",
        )
        .sort((left, right) => (left.timestamp_seconds ?? 0) - (right.timestamp_seconds ?? 0)),
    [annotations],
  );
  const duration = loadedDuration || durationSeconds || 0;
  const selectedAnnotation = timestampAnnotations.find((annotation) => annotation.id === selectedAnnotationId);

  useEffect(() => {
    if (!selectedAnnotation || !videoRef.current || typeof selectedAnnotation.timestamp_seconds !== "number") {
      return;
    }
    videoRef.current.currentTime = selectedAnnotation.timestamp_seconds;
    videoRef.current.pause();
  }, [selectedAnnotation]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200 bg-black">
        <video
          ref={videoRef}
          src={sourceUrl}
          controls
          className="block max-h-[64vh] w-full bg-black"
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            if (Number.isFinite(nextDuration)) {
              setLoadedDuration(nextDuration);
            }
          }}
          onTimeUpdate={(event) => onTimeChange?.(event.currentTarget.currentTime)}
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="relative h-4 rounded-full bg-slate-100">
          {timestampAnnotations.map((annotation) => {
            const timestamp = annotation.timestamp_seconds ?? 0;
            const left = duration > 0 ? Math.min(100, Math.max(0, (timestamp / duration) * 100)) : 0;
            const isSelected = annotation.id === selectedAnnotationId;

            return (
              <button
                key={annotation.id}
                type="button"
                title={`${formatTimestamp(timestamp)} - ${annotation.comment_text}`}
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = timestamp;
                    videoRef.current.pause();
                  }
                  onSelectAnnotation?.(annotation);
                }}
                className={[
                  "absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition",
                  isSelected ? "bg-rose-600 ring-4 ring-rose-200" : "bg-amber-500 hover:bg-rose-500",
                ].join(" ")}
                style={{ left: `${left}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
          <span>0:00</span>
          <span>{formatTimestamp(duration)}</span>
        </div>
      </div>

      {timestampAnnotations.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {timestampAnnotations.map((annotation) => (
            <button
              key={annotation.id}
              type="button"
              onClick={() => {
                if (videoRef.current && typeof annotation.timestamp_seconds === "number") {
                  videoRef.current.currentTime = annotation.timestamp_seconds;
                  videoRef.current.pause();
                }
                onSelectAnnotation?.(annotation);
              }}
              className={[
                "rounded-md border px-3 py-2 text-left text-xs transition",
                annotation.id === selectedAnnotationId
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="font-semibold">{formatTimestamp(annotation.timestamp_seconds)}</span>{" "}
              <span>{annotation.comment_text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";

import {
  getContentRequestReferenceMaterialViewerSourceArrayBuffer,
  getContentRequestReferenceMaterialViewerSourceBlob,
} from "../../api/materialRequests";
import type { ContentRequestReferenceMaterial } from "../../types/materialRequest";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/fileSize";
import { AudioViewer } from "../viewer/AudioViewer";
import { ImageViewer } from "../viewer/ImageViewer";
import { PdfViewer } from "../viewer/PdfViewer";
import { VideoViewer } from "../viewer/VideoViewer";


type ReferenceMaterialViewerProps = {
  requestId: string;
  material: ContentRequestReferenceMaterial | null;
  onClose: () => void;
};


type ReferencePreviewType = "PDF" | "IMAGE" | "VIDEO" | "AUDIO" | "UNSUPPORTED";


const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";


function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}


function getPreviewType(material: ContentRequestReferenceMaterial | null): ReferencePreviewType {
  if (!material) {
    return "UNSUPPORTED";
  }
  const extension = getFileExtension(material.original_filename);
  if (
    material.mime_type === "application/pdf" ||
    material.mime_type === "application/msword" ||
    material.mime_type === "application/vnd.ms-excel" ||
    material.mime_type === "application/vnd.ms-powerpoint" ||
    material.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    material.mime_type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    material.mime_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    [".doc", ".docx", ".pdf", ".ppt", ".pptx", ".xls", ".xlsx"].includes(extension)
  ) {
    return "PDF";
  }
  if (material.mime_type === "image/jpeg" || material.mime_type === "image/png") {
    return "IMAGE";
  }
  if (["video/mp4", "video/ogg", "video/quicktime", "video/webm"].includes(material.mime_type)) {
    return "VIDEO";
  }
  if (
    [
      "audio/aac",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/wav",
      "audio/webm",
      "audio/x-m4a",
      "audio/x-wav",
    ].includes(material.mime_type)
  ) {
    return "AUDIO";
  }
  return "UNSUPPORTED";
}


export function ReferenceMaterialViewer({ requestId, material, onClose }: ReferenceMaterialViewerProps) {
  const previewType = useMemo(() => getPreviewType(material), [material]);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | null = null;

    async function loadPreview() {
      setPdfData(null);
      setSourceUrl(null);
      setErrorMessage(null);

      if (!material || previewType === "UNSUPPORTED") {
        return;
      }

      setIsLoading(true);
      try {
        if (previewType === "PDF") {
          const buffer = await getContentRequestReferenceMaterialViewerSourceArrayBuffer(requestId, material.id);
          if (!isCancelled) {
            setPdfData(buffer);
          }
          return;
        }

        const blob = await getContentRequestReferenceMaterialViewerSourceBlob(requestId, material.id);
        objectUrl = window.URL.createObjectURL(blob);
        if (!isCancelled) {
          setSourceUrl(objectUrl);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [material, previewType, requestId]);

  if (!material) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/50 px-4 py-5">
      <section className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-base font-semibold text-slate-950">{material.original_filename}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {material.mime_type} / {formatFileSize(material.file_size)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(previewType === "PDF" || previewType === "IMAGE") && (
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
              <button type="button" onClick={onClose} className={secondaryButtonClass}>
                Close
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50 p-5">
          {isLoading ? (
            <div className="h-96 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
          ) : errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : previewType === "PDF" && pdfData ? (
            <PdfViewer
              data={pdfData}
              annotations={[]}
              mode="idle"
              zoom={zoom}
            />
          ) : previewType === "IMAGE" && sourceUrl ? (
            <ImageViewer
              sourceUrl={sourceUrl}
              annotations={[]}
              mode="idle"
              zoom={zoom}
            />
          ) : previewType === "VIDEO" && sourceUrl ? (
            <VideoViewer
              sourceUrl={sourceUrl}
              annotations={[]}
            />
          ) : previewType === "AUDIO" && sourceUrl ? (
            <AudioViewer
              sourceUrl={sourceUrl}
              annotations={[]}
            />
          ) : (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              This reference material cannot be previewed in the browser.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

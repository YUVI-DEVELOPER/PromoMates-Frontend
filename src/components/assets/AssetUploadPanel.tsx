import { ChangeEvent, DragEvent, useRef, useState } from "react";

import { uploadDocumentAsset } from "../../api/assets";
import { assetTypeOptions, type AssetType } from "../../types/contentVersion";
import type { DocumentStatus } from "../../types/document";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatFileSize } from "../../utils/fileSize";


type AssetUploadPanelProps = {
  documentId: number;
  documentStatus: DocumentStatus;
  onUploaded: () => Promise<void> | void;
};


const maxUploadSizeBytes = 25 * 1024 * 1024;
const allowedExtensions = [".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg", ".txt"];
const editableStatuses: DocumentStatus[] = ["DRAFT", "CHANGES_REQUESTED"];


function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}


function validateFile(file: File | null): string | null {
  if (!file) {
    return "Choose a file to upload.";
  }

  if (!allowedExtensions.includes(getFileExtension(file.name))) {
    return "Unsupported file type. Upload PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, or TXT.";
  }

  if (file.size > maxUploadSizeBytes) {
    return "File is too large. Maximum upload size is 25 MB.";
  }

  return null;
}


export function AssetUploadPanel({
  documentId,
  documentStatus,
  onUploaded,
}: AssetUploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState<AssetType>("MLR_REVIEW_FILE");
  const [versionLabel, setVersionLabel] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isUploadEnabled = editableStatuses.includes(documentStatus);

  function chooseFile(file: File | null) {
    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (isUploadEnabled) {
      setIsDragging(true);
    }
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!isUploadEnabled) {
      return;
    }

    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage(null);
      return;
    }
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await uploadDocumentAsset(documentId, selectedFile, {
        asset_type: assetType,
        is_primary: assetType === "MLR_REVIEW_FILE",
        version_label: versionLabel,
        change_summary: changeSummary,
      });
      setSelectedFile(null);
      setVersionLabel("");
      setChangeSummary("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setSuccessMessage("Review file uploaded successfully.");
      await onUploaded();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  if (!isUploadEnabled) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Upload Review File</h3>
        <p className="mt-2 text-sm text-slate-600">
          Upload is available only while the review content is Draft or Changes Requested.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">Upload Review File</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload is available only while the review content is Draft or Changes Requested.{" "}
          Supported files: PDF, DOCX, PPTX, XLSX, PNG, JPG, JPEG, TXT. Maximum size:
          25 MB.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-4">
          <label
            htmlFor="asset-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              "block rounded-md border border-dashed px-4 py-5 text-sm transition",
              isDragging
                ? "border-brand-400 bg-brand-50 text-brand-800"
                : "border-slate-300 bg-slate-50 text-slate-600",
            ].join(" ")}
          >
            <span className="font-semibold text-slate-900">
              {selectedFile ? selectedFile.name : "Choose a file or drop it here"}
            </span>
            {selectedFile && (
              <span className="mt-1 block text-xs text-slate-500">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
            <input
              ref={inputRef}
              id="asset-upload"
              type="file"
              accept={allowedExtensions.join(",")}
              onChange={handleInputChange}
              className="sr-only"
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-slate-700">Asset Type</span>
              <select
                value={assetType}
                onChange={(event) => setAssetType(event.target.value as AssetType)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {assetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-slate-700">Version Label</span>
              <input
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                maxLength={120}
                placeholder="Draft V1"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="grid gap-1 text-sm lg:col-span-1">
              <span className="font-semibold text-slate-700">Change Summary</span>
              <input
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value)}
                maxLength={5000}
                placeholder="Initial upload"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="h-10 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isUploading ? "Uploading..." : "Upload Review File"}
        </button>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={[
            "mt-4 rounded-md border px-3 py-2 text-sm",
            errorMessage
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {errorMessage || successMessage}
        </div>
      )}
    </section>
  );
}

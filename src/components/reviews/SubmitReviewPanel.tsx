import { useEffect, useState } from "react";

import { submitDocumentReview } from "../../api/reviews";
import { getDefaultWorkflow } from "../../api/workflows";
import type { DocumentStatus } from "../../types/document";
import type { SubmitReviewResponse } from "../../types/review";
import type { Workflow } from "../../types/workflow";
import { getApiErrorMessage } from "../../utils/apiError";


type SubmitReviewPanelProps = {
  documentId: number;
  documentStatus: DocumentStatus;
  hasPrimaryAsset: boolean;
  onSubmitted: (response: SubmitReviewResponse) => Promise<void> | void;
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";


export function SubmitReviewPanel({
  documentId,
  documentStatus,
  hasPrimaryAsset,
  onSubmitted,
}: SubmitReviewPanelProps) {
  const [comment, setComment] = useState("");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canSubmit = documentStatus === "READY_FOR_REVIEW" && hasPrimaryAsset && !isSubmitting;

  useEffect(() => {
    let isMounted = true;

    async function loadDefaultWorkflow() {
      setIsLoadingWorkflow(true);
      setWorkflowMessage(null);

      try {
        const defaultWorkflow = await getDefaultWorkflow();
        if (isMounted) {
          setWorkflow(defaultWorkflow);
        }
      } catch (error) {
        if (isMounted) {
          setWorkflow(null);
          setWorkflowMessage(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingWorkflow(false);
        }
      }
    }

    void loadDefaultWorkflow();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    if (
      !window.confirm(
        "Submit this document for MLR review? Medical, legal, regulatory, and approval tasks will be created from the configured workflow.",
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await submitDocumentReview(documentId, {
        comment: comment.trim() || null,
      });
      setComment("");
      await onSubmitted(response);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-950">Submit for MLR Review</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Submitting this document will create MLR review tasks from the workflow configured by an administrator.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {isLoadingWorkflow ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Loading configured workflow...
          </div>
        ) : workflow ? (
          <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-sm font-semibold text-sky-900">
              {workflow.name} ({workflow.code})
            </p>
            <p className="mt-1 text-sm text-sky-800">
              {workflow.stages?.length ?? 0} configured stages will be used for this review.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {workflowMessage || "Configure workflow stages manually in Admin Setup before submitting MLR."}
          </div>
        )}

        {documentStatus !== "READY_FOR_REVIEW" && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            This document must be Ready for Review before it can be submitted.
          </div>
        )}

        {documentStatus === "READY_FOR_REVIEW" && !hasPrimaryAsset && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Upload a primary file before submitting this document for review.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Submission comment</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Optional note for reviewers"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={primaryButtonClass}
          >
            {isSubmitting ? "Submitting..." : "Submit for MLR Review"}
          </button>
        </div>
      </div>
    </section>
  );
}

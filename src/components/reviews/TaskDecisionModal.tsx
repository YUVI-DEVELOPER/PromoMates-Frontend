import { useEffect, useState } from "react";

import type { ReviewDecision, TaskDecisionPayload } from "../../types/review";


type TaskDecisionModalProps = {
  isOpen: boolean;
  initialDecision: ReviewDecision;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: TaskDecisionPayload) => Promise<void> | void;
};


const decisionLabels: Record<ReviewDecision, string> = {
  APPROVE: "Approve",
  CHANGES_REQUESTED: "Request Changes",
  REJECT: "Reject",
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";


export function TaskDecisionModal({
  isOpen,
  initialDecision,
  isSubmitting = false,
  errorMessage,
  onClose,
  onSubmit,
}: TaskDecisionModalProps) {
  const [decision, setDecision] = useState<ReviewDecision>(initialDecision);
  const [decisionComment, setDecisionComment] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDecision(initialDecision);
      setDecisionComment("");
      setValidationMessage(null);
    }
  }, [initialDecision, isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit() {
    const trimmedComment = decisionComment.trim();
    if ((decision === "CHANGES_REQUESTED" || decision === "REJECT") && !trimmedComment) {
      setValidationMessage("A decision comment is required for changes requested or rejected tasks.");
      return;
    }

    setValidationMessage(null);
    await onSubmit({
      decision,
      decision_comment: trimmedComment || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-decision-title"
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 id="task-decision-title" className="text-base font-semibold text-slate-950">
            Record Review Decision
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Choose the reviewer decision for this task.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {(validationMessage || errorMessage) && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {validationMessage || errorMessage}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Decision</span>
            <select
              value={decision}
              onChange={(event) => setDecision(event.target.value as ReviewDecision)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              {Object.entries(decisionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Decision comment</span>
            <textarea
              value={decisionComment}
              onChange={(event) => setDecisionComment(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Add context for the decision"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Required for Request Changes or Reject.
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? "Saving..." : "Confirm Decision"}
          </button>
        </div>
      </section>
    </div>
  );
}

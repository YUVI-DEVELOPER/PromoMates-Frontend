import type { ReactNode } from "react";


export type WorkflowStepStatus = "completed" | "current" | "pending" | "failed";


export type WorkflowStep = {
  label: string;
  status: WorkflowStepStatus;
  helperText?: string;
  timestamp?: string;
  icon?: ReactNode;
};


type WorkflowStepperProps = {
  steps: WorkflowStep[];
  title?: string;
  subtitle?: string;
};


const stepStyles: Record<WorkflowStepStatus, string> = {
  completed: "border-emerald-300 bg-emerald-50 text-emerald-700",
  current: "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100",
  pending: "border-slate-300 bg-white text-slate-500",
  failed: "border-rose-300 bg-rose-50 text-rose-700",
};


export function WorkflowStepper({ steps, title, subtitle }: WorkflowStepperProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h3 className="text-base font-semibold text-slate-950">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
      )}

      <ol className="grid gap-3 lg:grid-cols-6">
        {steps.map((step, index) => (
          <li key={`${step.label}-${index}`} className="relative">
            <div className="flex h-full gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:block lg:bg-white">
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  stepStyles[step.status],
                ].join(" ")}
                aria-label={`${step.label}: ${step.status}`}
              >
                {step.icon ?? (step.status === "completed" ? "OK" : index + 1)}
              </div>
              <div className="min-w-0 lg:mt-3">
                <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                {step.helperText && (
                  <p className="mt-1 text-xs leading-5 text-slate-500">{step.helperText}</p>
                )}
                {step.timestamp && (
                  <p className="mt-2 text-xs font-medium text-slate-500">{step.timestamp}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

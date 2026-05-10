import type { ReactNode } from "react";

import { SummaryCard } from "./SummaryCard";


type CurrentNextStepCardProps = {
  title: string;
  description: string;
  status: ReactNode;
  action?: ReactNode;
};


export function CurrentNextStepCard({
  title,
  description,
  status,
  action,
}: CurrentNextStepCardProps) {
  return (
    <SummaryCard title="Current Next Step" action={action}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="shrink-0">{status}</div>
      </div>
    </SummaryCard>
  );
}

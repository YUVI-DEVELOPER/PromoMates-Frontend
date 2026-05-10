import type { ReactNode } from "react";


type NextActionCardProps = {
  title: string;
  description: ReactNode;
  action?: ReactNode;
};


export function NextActionCard({ title, description, action }: NextActionCardProps) {
  return (
    <section className="rounded-lg border border-brand-100 bg-brand-50/70 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        Next Recommended Action
      </p>
      <h3 className="mt-2 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}

import type { ReactNode } from "react";


type SummaryCardProps = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};


export function SummaryCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: SummaryCardProps) {
  return (
    <section className={["rounded-lg border border-slate-200 bg-white shadow-sm", className].join(" ")}>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          {subtitle && <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

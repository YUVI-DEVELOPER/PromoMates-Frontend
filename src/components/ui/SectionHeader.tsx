import type { ReactNode } from "react";


type SectionHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
};


export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {subtitle && <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

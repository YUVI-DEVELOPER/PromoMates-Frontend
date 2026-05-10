import type { ReactNode } from "react";


type KpiCardProps = {
  label: string;
  value: ReactNode;
  helperText?: ReactNode;
  trend?: ReactNode;
  status?: "neutral" | "success" | "warning" | "danger" | "info";
};


const accentClasses: Record<NonNullable<KpiCardProps["status"]>, string> = {
  danger: "border-l-rose-500",
  info: "border-l-brand-600",
  neutral: "border-l-slate-300",
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
};


export function KpiCard({
  label,
  value,
  helperText,
  trend,
  status = "neutral",
}: KpiCardProps) {
  return (
    <article
      className={[
        "rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm",
        accentClasses[status],
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {trend && <div className="text-xs font-semibold text-slate-500">{trend}</div>}
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      {helperText && <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>}
    </article>
  );
}

type LoadingStateProps = {
  label?: string;
  rows?: number;
};


export function LoadingState({ label = "Loading...", rows = 3 }: LoadingStateProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <div className="mt-4 space-y-3" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

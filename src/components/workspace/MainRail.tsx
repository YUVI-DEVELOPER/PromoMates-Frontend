import type { WorkspaceModule, WorkspaceModuleId } from "../../navigation";


type MainRailProps = {
  modules: WorkspaceModule[];
  activeModuleId: WorkspaceModuleId;
  onSelect: (moduleId: WorkspaceModuleId) => void;
};


export function MainRail({ modules, activeModuleId, onSelect }: MainRailProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[5.75rem] shrink-0 border-r border-slate-200 bg-slate-950 text-slate-200 md:flex md:flex-col">
      <div className="border-b border-slate-800 px-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
          PC
        </div>
        <p className="mt-2 text-xs font-semibold text-white">PromoCon</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Main modules">
        {modules.map((module) => {
          const isActive = module.id === activeModuleId;
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onSelect(module.id)}
              className={[
                "flex w-full flex-col items-center gap-1 rounded-md px-2 py-2.5 text-center text-[0.72rem] font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-100",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
              title={module.label}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-current/20 text-[0.7rem]">
                {module.shortLabel}
              </span>
              <span className="leading-tight">{module.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

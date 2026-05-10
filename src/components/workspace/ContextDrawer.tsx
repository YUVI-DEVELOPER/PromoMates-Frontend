import type { DrawerGroup, WorkspaceModule } from "../../navigation";


type ContextDrawerProps = {
  module: WorkspaceModule;
  groups: DrawerGroup[];
  currentPath: string;
  onOpen: (path: string, label?: string) => void;
};


export function ContextDrawer({ module, groups, currentPath, onOpen }: ContextDrawerProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module</p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">{module.label}</h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={`${module.label} pages`}>
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? `${module.id}-${groupIndex}`} className="mb-5 last:mb-0">
            {group.label && (
              <p className="px-2 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
            )}
            <div className="mt-2 space-y-1">
              {dedupeDrawerItems(group.items).map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => onOpen(item.path, item.label)}
                    className={[
                      "block w-full rounded-md border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-100",
                      isActive
                        ? "border-brand-100 bg-brand-50 text-brand-700"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="font-semibold">{item.label}</span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {item.description}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}


function dedupeDrawerItems<T extends { path: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.path)) {
      return false;
    }
    seen.add(item.path);
    return true;
  });
}

import type { KeyboardEvent, ReactNode } from "react";


export type WorkspaceTab<TabId extends string> = {
  id: TabId;
  label: string;
  helperText?: string;
  content: ReactNode;
};


type TabbedWorkspaceProps<TabId extends string> = {
  tabs: WorkspaceTab<TabId>[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};


export function TabbedWorkspace<TabId extends string>({
  tabs,
  activeTab,
  onTabChange,
}: TabbedWorkspaceProps<TabId>) {
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    onTabChange(tabs[nextIndex].id);
  }

  return (
    <section className="space-y-4">
      <div
        className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
        role="tablist"
        aria-label="Dashboard tabs"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={[
                "shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-200",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTabConfig?.helperText && (
          <p className="mb-4 text-sm leading-6 text-slate-600">{activeTabConfig.helperText}</p>
        )}
        {activeTabConfig?.content}
      </div>
    </section>
  );
}

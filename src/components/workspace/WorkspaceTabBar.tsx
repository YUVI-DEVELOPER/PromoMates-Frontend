import type { KeyboardEvent } from "react";

import type { WorkspaceTab } from "../../context/WorkspaceTabsContext";


type WorkspaceTabBarProps = {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onFocusTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
};


export function WorkspaceTabBar({
  tabs,
  activeTabId,
  onFocusTab,
  onCloseTab,
}: WorkspaceTabBarProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onFocusTab(nextTab.id);
    }
  }

  return (
    <div
      className="flex h-11 items-end overflow-x-auto border-b border-slate-200 bg-slate-100 px-2"
      role="tablist"
      aria-label="Dashboard tabs"
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={[
              "group flex h-10 max-w-[16rem] shrink-0 items-center gap-2 border border-b-0 px-3 text-sm",
              isActive
                ? "border-slate-200 bg-white text-slate-950"
                : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            ].join(" ")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              title={tab.helperText || tab.label}
              onClick={() => onFocusTab(tab.id)}
              className="min-w-0 flex-1 truncate text-left font-medium focus:outline-none"
            >
              {tab.isDirty && <span aria-label="Unsaved changes">* </span>}
              {tab.label}
            </button>
            {!tab.isPinned && (
              <button
                type="button"
                onClick={() => onCloseTab(tab.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label={`Close ${tab.label}`}
                title="Close tab"
              >
                x
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

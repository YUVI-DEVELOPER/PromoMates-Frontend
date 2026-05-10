import { useMemo, useState, type ReactNode } from "react";


export type BottomDrawerTab = {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
};


type BottomDrawerProps = {
  tabs: BottomDrawerTab[];
  title?: string;
};


export function BottomDrawer({ tabs, title = "Record Details" }: BottomDrawerProps) {
  const visibleTabs = useMemo(() => tabs.filter(Boolean), [tabs]);
  const [activeTabId, setActiveTabId] = useState(visibleTabs[0]?.id ?? "");
  const activeTab = visibleTabs.find((tab) => tab.id === activeTabId) ?? visibleTabs[0];

  if (visibleTabs.length === 0 || !activeTab) {
    return null;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={title}>
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-100",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                {tab.label}
                {typeof tab.count === "number" ? ` (${tab.count})` : ""}
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-h-[26rem] overflow-auto p-4" role="tabpanel">
        {activeTab.content}
      </div>
    </section>
  );
}

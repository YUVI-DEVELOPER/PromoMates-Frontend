import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getWorkspaceTabDescriptor } from "../navigation";
import { useAuth } from "./AuthContext";


export type WorkspaceTab = {
  id: string;
  path: string;
  label: string;
  helperText?: string;
  isPinned: boolean;
  isDirty: boolean;
  lastFocusedAt: number;
  lastRefreshedAt: number;
  refreshNonce: number;
};


type WorkspaceTabsContextValue = {
  tabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (path: string, options?: Partial<Pick<WorkspaceTab, "label" | "helperText">>) => void;
  focusTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  updateActiveTab: (updates: Partial<Pick<WorkspaceTab, "label" | "helperText" | "isDirty">>) => void;
  setActiveTabDirty: (isDirty: boolean) => void;
  activeRefreshNonce: number;
};


const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | undefined>(undefined);
const HOME_PATH = "/dashboard";
const STALE_THRESHOLD_MS = 60_000;


type WorkspaceTabsProviderProps = {
  children: ReactNode;
};


function normalizePath(path: string): string {
  if (!path) {
    return HOME_PATH;
  }

  return path.startsWith("/") ? path : `/${path}`;
}


function createTab(path: string, now: number): WorkspaceTab {
  const url = new URL(normalizePath(path), window.location.origin);
  const descriptor = getWorkspaceTabDescriptor(url.pathname, url.search);
  const tabPath = `${url.pathname}${url.search}`;

  return {
    id: tabPath,
    path: tabPath,
    label: descriptor.label,
    helperText: descriptor.helperText,
    isPinned: Boolean(descriptor.isPinned) || tabPath === HOME_PATH,
    isDirty: false,
    lastFocusedAt: now,
    lastRefreshedAt: now,
    refreshNonce: 0,
  };
}


function ensureHomeTab(tabs: WorkspaceTab[], now: number): WorkspaceTab[] {
  if (tabs.some((tab) => tab.path === HOME_PATH)) {
    return tabs;
  }

  return [createTab(HOME_PATH, now), ...tabs];
}


function maybeRefresh(tab: WorkspaceTab, now: number): WorkspaceTab {
  if (now - tab.lastRefreshedAt <= STALE_THRESHOLD_MS) {
    return tab;
  }

  return {
    ...tab,
    lastRefreshedAt: now,
    refreshNonce: tab.refreshNonce + 1,
  };
}


export function WorkspaceTabsProvider({ children }: WorkspaceTabsProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setTabs([]);
      setActiveTabId("");
      return;
    }

    const path = `${location.pathname}${location.search}`;
    if (location.pathname === "/login" || location.pathname === "/health") {
      return;
    }

    const now = Date.now();
    setTabs((currentTabs) => {
      const tabsWithHome = ensureHomeTab(currentTabs, now);
      const existingTab = tabsWithHome.find((tab) => tab.path === path);

      if (existingTab) {
        return tabsWithHome.map((tab) =>
          tab.path === path
            ? maybeRefresh({ ...tab, lastFocusedAt: now }, now)
            : tab,
        );
      }

      return [...tabsWithHome, createTab(path, now)];
    });
    setActiveTabId(path);
  }, [isAuthenticated, location.pathname, location.search]);

  const openTab = useCallback(
    (path: string, options: Partial<Pick<WorkspaceTab, "label" | "helperText">> = {}) => {
      const normalizedPath = normalizePath(path);
      const now = Date.now();
      setTabs((currentTabs) => {
        const tabsWithHome = ensureHomeTab(currentTabs, now);
        const existingTab = tabsWithHome.find((tab) => tab.path === normalizedPath);

        if (existingTab) {
          return tabsWithHome.map((tab) =>
            tab.path === normalizedPath
              ? maybeRefresh({ ...tab, ...options, lastFocusedAt: now }, now)
              : tab,
          );
        }

        return [...tabsWithHome, { ...createTab(normalizedPath, now), ...options }];
      });
      setActiveTabId(normalizedPath);
      navigate(normalizedPath);
    },
    [navigate],
  );

  const focusTab = useCallback(
    (tabId: string) => {
      const targetTab = tabs.find((tab) => tab.id === tabId);
      if (!targetTab) {
        return;
      }

      const now = Date.now();
      setTabs((currentTabs) =>
        currentTabs.map((tab) =>
          tab.id === tabId ? maybeRefresh({ ...tab, lastFocusedAt: now }, now) : tab,
        ),
      );
      setActiveTabId(tabId);
      navigate(targetTab.path);
    },
    [navigate, tabs],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const targetTab = tabs.find((tab) => tab.id === tabId);
      if (!targetTab || targetTab.isPinned) {
        return;
      }

      if (targetTab.isDirty && !window.confirm(`Close ${targetTab.label} with unsaved changes?`)) {
        return;
      }

      const nextTabs = tabs.filter((tab) => tab.id !== tabId);
      setTabs(nextTabs);

      if (activeTabId === tabId) {
        const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
        const nextActiveTab =
          nextTabs[Math.max(0, closedIndex - 1)] ??
          nextTabs[0] ??
          createTab(HOME_PATH, Date.now());
        setActiveTabId(nextActiveTab.id);
        navigate(nextActiveTab.path);
      }
    },
    [activeTabId, navigate, tabs],
  );

  const updateActiveTab = useCallback(
    (updates: Partial<Pick<WorkspaceTab, "label" | "helperText" | "isDirty">>) => {
      setTabs((currentTabs) =>
        currentTabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, ...updates } : tab,
        ),
      );
    },
    [activeTabId],
  );

  const setActiveTabDirty = useCallback(
    (isDirty: boolean) => {
      updateActiveTab({ isDirty });
    },
    [updateActiveTab],
  );

  const activeRefreshNonce = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId)?.refreshNonce ?? 0,
    [activeTabId, tabs],
  );

  const value = useMemo<WorkspaceTabsContextValue>(
    () => ({
      tabs,
      activeTabId,
      openTab,
      focusTab,
      closeTab,
      updateActiveTab,
      setActiveTabDirty,
      activeRefreshNonce,
    }),
    [activeRefreshNonce, activeTabId, closeTab, focusTab, openTab, setActiveTabDirty, tabs, updateActiveTab],
  );

  return <WorkspaceTabsContext.Provider value={value}>{children}</WorkspaceTabsContext.Provider>;
}


export function useWorkspaceTabs(): WorkspaceTabsContextValue {
  const context = useContext(WorkspaceTabsContext);

  if (!context) {
    throw new Error("useWorkspaceTabs must be used within WorkspaceTabsProvider.");
  }

  return context;
}


export function useActiveTabRefreshNonce(): number {
  return useWorkspaceTabs().activeRefreshNonce;
}

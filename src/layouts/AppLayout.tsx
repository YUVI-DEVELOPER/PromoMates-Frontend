import { useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ContextDrawer } from "../components/workspace/ContextDrawer";
import { MainRail } from "../components/workspace/MainRail";
import { WorkspaceTabBar } from "../components/workspace/WorkspaceTabBar";
import { useAuth } from "../context/AuthContext";
import { useWorkspaceTabs } from "../context/WorkspaceTabsContext";
import {
  getDefaultPathForModule,
  getModuleIdForPath,
  getVisibleDrawerGroups,
  getVisibleWorkspaceModules,
  type PermissionContext,
  type WorkspaceModuleId,
} from "../navigation";


type AppLayoutProps = {
  children: ReactNode;
};


export function AppLayout({ children }: AppLayoutProps) {
  const { hasAnyPermission, hasPermission, isAuthenticated, isSuperuser, logout, user } = useAuth();
  const { activeTabId, closeTab, focusTab, openTab, tabs } = useWorkspaceTabs();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicPage = location.pathname === "/login" || location.pathname === "/health";
  const currentPath = `${location.pathname}${location.search}`;
  const permissionContext = useMemo<PermissionContext>(
    () => ({
      isSuperuser,
      hasPermission,
      hasAnyPermission: (permissionKeys) => hasAnyPermission([...permissionKeys]),
    }),
    [hasAnyPermission, hasPermission, isSuperuser],
  );
  const visibleModules = useMemo(
    () => getVisibleWorkspaceModules(permissionContext),
    [permissionContext],
  );
  const activeModuleId = getModuleIdForPath(location.pathname, location.search);
  const activeModule =
    visibleModules.find((module) => module.id === activeModuleId) ??
    visibleModules[0];
  const drawerGroups = activeModule
    ? getVisibleDrawerGroups(activeModule.id, permissionContext)
    : [];
  const mobileDrawerItems = useMemo(
    () => dedupeDrawerItems(drawerGroups.flatMap((group) => group.items)),
    [drawerGroups],
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleSelectModule(moduleId: WorkspaceModuleId) {
    openTab(getDefaultPathForModule(moduleId, permissionContext));
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <MainRail
          modules={visibleModules}
          activeModuleId={activeModule?.id ?? "workspace"}
          onSelect={handleSelectModule}
        />

        {activeModule && (
          <ContextDrawer
            module={activeModule}
            groups={drawerGroups}
            currentPath={currentPath}
            onOpen={(path, label) => openTab(path, label ? { label } : undefined)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3 md:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">
                  PC
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">PromoCon</p>
                  <p className="text-xs text-slate-500">Enterprise dashboard</p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor="global-search">
                  Global search
                </label>
                <input
                  id="global-search"
                  type="search"
                  placeholder="Search requests, content, tasks..."
                  className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100 lg:max-w-xl"
                />
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <span className="text-sm font-semibold">!</span>
                </button>

                {isAuthenticated && (
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden h-9 w-9 items-center justify-center rounded-md border border-brand-100 bg-brand-50 text-sm font-semibold text-brand-700 sm:flex">
                      {getUserInitials(user?.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-48 truncate text-sm font-semibold text-slate-900">
                        {user?.full_name}
                      </p>
                      <p className="max-w-48 truncate text-xs text-slate-500">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto border-t border-slate-200 px-3 py-2 md:hidden">
              {visibleModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => handleSelectModule(module.id)}
                  className={[
                    "shrink-0 rounded-md px-3 py-2 text-xs font-semibold",
                    module.id === activeModule?.id
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {module.label}
                </button>
              ))}
            </div>
          </header>

          <WorkspaceTabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onFocusTab={focusTab}
            onCloseTab={closeTab}
          />

          {activeModule && drawerGroups.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
              {mobileDrawerItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => openTab(item.path, { label: item.label })}
                  className={[
                    "shrink-0 rounded-md border px-3 py-2 text-xs font-semibold",
                    currentPath === item.path
                      ? "border-brand-100 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
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


function getUserInitials(fullName?: string): string {
  if (!fullName) {
    return "PC";
  }

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "PC";
}

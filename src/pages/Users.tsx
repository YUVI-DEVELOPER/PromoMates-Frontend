import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createUser,
  deleteUser,
  getRoles,
  getUsers,
  updateUser,
} from "../api/users";
import {
  getCountries,
  getRegions,
  getSubTherapyAreas,
  getTherapeuticAreas,
} from "../api/masterData";
import { getUserGroupOptions } from "../api/userGroups";
import { UserFormModal } from "../components/users/UserFormModal";
import { DataTable, type DataTableColumn } from "../components/ui/DataTable";
import { ErrorState } from "../components/ui/ErrorState";
import { KpiCard } from "../components/ui/KpiCard";
import { PageContainer } from "../components/ui/PageContainer";
import { PageHeroSummary } from "../components/ui/PageHeroSummary";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type {
  Role,
  User,
  UserCreatePayload,
  UserUpdatePayload,
} from "../types/user";
import type { UserGroupOption } from "../types/userGroup";
import type { Country, Region, SubTherapyArea, TherapeuticArea } from "../types/masterData";
import { getRoleLabel } from "../utils/roles";
import { PERMISSIONS } from "../utils/permissions";


type ModalState =
  | { mode: "create"; user: null }
  | { mode: "edit"; user: User };


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100";


function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item?.msg === "string" ? item.msg : "Invalid request."))
        .join(" ");
    }

    if (error.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }

    if (error.message) {
      return error.message;
    }
  }

  return "Something went wrong. Please try again.";
}


function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function getUserRoleLabels(user: User): string[] {
  return user.roles.flatMap((role) => [role.name, role.code]);
}


function canDeleteUser(user: User): boolean {
  return user.groups.every((group) => !group.is_active);
}


export function Users() {
  const { hasPermission, user: currentUser, refreshCurrentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [therapeuticAreas, setTherapeuticAreas] = useState<TherapeuticArea[]>([]);
  const [subTherapyAreas, setSubTherapyAreas] = useState<SubTherapyArea[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);

  const canManageSuperuser = hasPermission(PERMISSIONS.MANAGE_SYSTEM);

  const loadUsersAndRoles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        nextUsers,
        nextRoles,
        nextGroups,
        nextRegions,
        nextCountries,
        nextTherapeuticAreas,
        nextSubTherapyAreas,
      ] = await Promise.all([
        getUsers(),
        getRoles(),
        getUserGroupOptions().catch(() => []),
        getRegions().catch(() => []),
        getCountries().catch(() => []),
        getTherapeuticAreas().catch(() => []),
        getSubTherapyAreas().catch(() => []),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
      setGroups(nextGroups);
      setRegions(nextRegions);
      setCountries(nextCountries);
      setTherapeuticAreas(nextTherapeuticAreas);
      setSubTherapyAreas(nextSubTherapyAreas);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsersAndRoles();
  }, [loadUsersAndRoles]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleUsers = includeInactive
      ? users
      : users.filter((user) => user.is_active);

    if (!normalizedSearch) {
      return visibleUsers;
    }

    return visibleUsers.filter((user) => {
      const roleNames = getUserRoleLabels(user)
        .flatMap((roleName) => [roleName, getRoleLabel(roleName)])
        .join(" ")
        .toLowerCase();
      const groupNames = user.groups
        .map((group) => `${group.name} ${group.code}`)
        .join(" ")
        .toLowerCase();
      return [
        user.full_name,
        user.email,
        user.phone_number ?? "",
        user.designation ?? "",
        user.department ?? "",
        roleNames,
        groupNames,
      ].some(
        (value) => value.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [includeInactive, searchTerm, users]);

  const userColumns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        header: "User",
        className: "min-w-72",
        render: (managedUser) => {
          const isCurrentUser = currentUser?.id === managedUser.id;
          return (
            <div>
              <div className="font-medium text-slate-950">
                {managedUser.full_name}
                {isCurrentUser && (
                  <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    You
                  </span>
                )}
              </div>
              <div className="mt-1 text-slate-600">{managedUser.email}</div>
              {managedUser.phone_number && (
                <div className="mt-1 text-slate-500">{managedUser.phone_number}</div>
              )}
              {(managedUser.designation || managedUser.department) && (
                <div className="mt-1 text-xs text-slate-500">
                  {[managedUser.designation, managedUser.department].filter(Boolean).join(" / ")}
                </div>
              )}
              {managedUser.is_superuser && (
                <div className="mt-2 text-xs font-semibold text-brand-700">Superuser</div>
              )}
            </div>
          );
        },
      },
      {
        header: "Status",
        render: (managedUser) => (
          <StatusBadge status={managedUser.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        header: "Roles",
        className: "min-w-72",
        render: (managedUser) => (
          <div className="flex max-w-md flex-wrap gap-2">
            {managedUser.roles.map((role) => (
              <span
                key={role.id}
                className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
              >
                {getRoleLabel(role.name)}
              </span>
            ))}
          </div>
        ),
      },
      {
        header: "Groups",
        className: "min-w-72",
        render: (managedUser) => (
          <div className="flex max-w-md flex-wrap gap-2">
            {managedUser.groups.length === 0 ? (
              <span className="text-xs font-medium text-slate-500">No groups</span>
            ) : (
              managedUser.groups.map((group) => (
                <span
                  key={group.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {group.name}
                </span>
              ))
            )}
          </div>
        ),
      },
      {
        header: "Last Login",
        render: (managedUser) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTime(managedUser.last_login_at)}
          </span>
        ),
      },
    ],
    [currentUser?.id],
  );

  async function handleSubmitUser(payload: UserCreatePayload | UserUpdatePayload) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setFormErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (modalState?.mode === "edit") {
        const updatedUser = await updateUser(modalState.user.id, payload as UserUpdatePayload);
        setSuccessMessage(`Updated ${updatedUser.full_name}.`);

        if (currentUser?.id === updatedUser.id) {
          await refreshCurrentUser();
        }
      } else {
        const createdUser = await createUser(payload as UserCreatePayload);
        setSuccessMessage(`Created ${createdUser.full_name}.`);
      }

      setModalState(null);
      await loadUsersAndRoles();
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(targetUser: User) {
    if (currentUser?.id === targetUser.id) {
      setErrorMessage("You cannot change your own active status.");
      return;
    }

    const nextStatus = !targetUser.is_active;
    const action = nextStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${action} ${targetUser.full_name}?`)) {
      return;
    }

    setBusyAction(`status-${targetUser.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedUser = await updateUser(targetUser.id, { is_active: nextStatus });
      setSuccessMessage(
        `${updatedUser.full_name} has been ${nextStatus ? "activated" : "deactivated"}.`,
      );
      await loadUsersAndRoles();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteUser(targetUser: User) {
    if (currentUser?.id === targetUser.id) {
      setErrorMessage("You cannot delete your own account.");
      return;
    }

    if (!window.confirm(`Delete ${targetUser.full_name}? This cannot be undone.`)) {
      return;
    }

    setBusyAction(`delete-${targetUser.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteUser(targetUser.id);
      setSuccessMessage(`Deleted ${targetUser.full_name}.`);
      await loadUsersAndRoles();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  const activeUsers = users.filter((managedUser) => managedUser.is_active).length;
  const adminUsers = users.filter((managedUser) =>
    managedUser.is_superuser || managedUser.roles.some((role) => role.permissions.includes(PERMISSIONS.MANAGE_SYSTEM)),
  ).length;
  const reviewerUsers = users.filter((managedUser) =>
    managedUser.roles.some((role) => role.permissions.includes(PERMISSIONS.REVIEW_MLR)),
  ).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Console"
        title="User Management"
        subtitle="Manage PromoCon users, role assignments, and account status for MLR review operations."
        status="ACTIVE"
        statusLabel="Access Controlled"
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setFormErrorMessage(null);
              setModalState({ mode: "create", user: null });
            }}
            className={primaryButtonClass}
          >
            Create User
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Users" value={users.length} helperText="All user accounts" status="info" />
        <KpiCard label="Active Users" value={activeUsers} helperText="Enabled accounts" status="success" />
        <KpiCard label="System Managers" value={adminUsers} helperText="Superuser or system permission" status="warning" />
        <KpiCard label="MLR Reviewers" value={reviewerUsers} helperText="CAN_REVIEW_MLR permission" status="neutral" />
      </div>

      {(errorMessage || successMessage) && (
        errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        )
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-slate-700" htmlFor="user-search">
              Search users
            </label>
            <input
              id="user-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, phone, or role"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            Show inactive users
          </label>
        </div>
      </div>

      <DataTable
        rows={filteredUsers}
        columns={userColumns}
        getRowKey={(managedUser) => managedUser.id}
        isLoading={isLoading}
        loadingLabel="Loading users..."
        emptyTitle={users.length === 0 ? "No users yet" : "No matching users"}
        emptyDescription={
          users.length === 0
            ? "Create the first team member to start assigning PromoCon roles."
            : includeInactive
              ? "Try searching for another name, email, phone, or role."
              : "No active users match the current search."
        }
        renderActions={(managedUser) => {
          const isCurrentUser = currentUser?.id === managedUser.id;
          const statusAction = managedUser.is_active ? "Deactivate" : "Activate";
          const showDeleteAction = !isCurrentUser && canDeleteUser(managedUser);

          return (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormErrorMessage(null);
                  setModalState({ mode: "edit", user: managedUser });
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void handleToggleActive(managedUser)}
                disabled={isCurrentUser || busyAction === `status-${managedUser.id}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                title={isCurrentUser ? "You cannot change your own status." : undefined}
              >
                {busyAction === `status-${managedUser.id}` ? "Saving" : statusAction}
              </button>
              {showDeleteAction && (
                <button
                  type="button"
                  onClick={() => void handleDeleteUser(managedUser)}
                  disabled={busyAction === `delete-${managedUser.id}`}
                  className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === `delete-${managedUser.id}` ? "Deleting" : "Delete"}
                </button>
              )}
            </>
          );
        }}
      />

      <UserFormModal
        isOpen={modalState !== null}
        mode={modalState?.mode ?? "create"}
        user={modalState?.user ?? null}
        roles={roles}
        groups={groups}
        users={users}
        regions={regions}
        countries={countries}
        therapeuticAreas={therapeuticAreas}
        subTherapyAreas={subTherapyAreas}
        canManageSuperuser={canManageSuperuser}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setModalState(null);
        }}
        onSubmit={handleSubmitUser}
      />
    </PageContainer>
  );
}

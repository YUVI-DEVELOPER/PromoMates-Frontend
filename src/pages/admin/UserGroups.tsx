import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  addUserToGroup,
  createUserGroup,
  deactivateUserGroup,
  getUserGroupMembers,
  getUserGroups,
  removeUserFromGroup,
  updateUserGroup,
} from "../../api/userGroups";
import { getUsers } from "../../api/users";
import { getLookupValuesByCategory } from "../../api/lookups";
import {
  getBrands,
  getCountries,
  getProducts,
  getRegions,
  getSubTherapyAreas,
  getTherapeuticAreas,
} from "../../api/masterData";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { FormDraftNotice } from "../../components/ui/FormDraftNotice";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import type { LookupValue } from "../../types/lookup";
import type { Brand, Country, Product, Region, SubTherapyArea, TherapeuticArea } from "../../types/masterData";
import type { User } from "../../types/user";
import type { UserGroup, UserGroupMember, UserGroupPayload } from "../../types/userGroup";
import { getApiErrorMessage } from "../../utils/apiError";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";


type ModalState =
  | { mode: "create"; group: null }
  | { mode: "edit"; group: UserGroup };


type FormState = {
  code: string;
  name: string;
  description: string;
  group_type: string;
  region_id: string;
  country_id: string;
  brand_id: string;
  product_id: string;
  therapeutic_area_id: string;
  sub_therapy_area_id: string;
  is_active: boolean;
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";


function toPayload(values: FormState): UserGroupPayload {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description.trim() || null,
    group_type: values.group_type.trim() || null,
    region_id: values.region_id ? Number(values.region_id) : null,
    country_id: values.country_id ? Number(values.country_id) : null,
    brand_id: values.brand_id ? Number(values.brand_id) : null,
    product_id: values.product_id ? Number(values.product_id) : null,
    therapeutic_area_id: values.therapeutic_area_id ? Number(values.therapeutic_area_id) : null,
    therapy_area_id: values.therapeutic_area_id ? Number(values.therapeutic_area_id) : null,
    sub_therapy_area_id: values.sub_therapy_area_id ? Number(values.sub_therapy_area_id) : null,
    is_active: values.is_active,
  };
}


function initialValues(group: UserGroup | null): FormState {
  return {
    code: group?.code ?? "",
    name: group?.name ?? "",
    description: group?.description ?? "",
    group_type: group?.group_type ?? "",
    region_id: group?.region_id ? String(group.region_id) : "",
    country_id: group?.country_id ? String(group.country_id) : "",
    brand_id: group?.brand_id ? String(group.brand_id) : "",
    product_id: group?.product_id ? String(group.product_id) : "",
    therapeutic_area_id: group?.therapeutic_area_id ? String(group.therapeutic_area_id) : "",
    sub_therapy_area_id: group?.sub_therapy_area_id ? String(group.sub_therapy_area_id) : "",
    is_active: group?.is_active ?? true,
  };
}


export function UserGroups() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [members, setMembers] = useState<UserGroupMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [therapeuticAreas, setTherapeuticAreas] = useState<TherapeuticArea[]>([]);
  const [subTherapyAreas, setSubTherapyAreas] = useState<SubTherapyArea[]>([]);
  const [groupTypes, setGroupTypes] = useState<LookupValue[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [search, setSearch] = useState("");
  const [filterGroupType, setFilterGroupType] = useState("");
  const [filterRegionId, setFilterRegionId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [filterTherapeuticAreaId, setFilterTherapeuticAreaId] = useState("");
  const [filterSubTherapyAreaId, setFilterSubTherapyAreaId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
    [groups, selectedGroupId],
  );

  const loadGroups = useCallback(async () => {
    setErrorMessage(null);
    const nextGroups = await getUserGroups({
      search: search.trim() || undefined,
      group_type: filterGroupType || undefined,
      region_id: filterRegionId ? Number(filterRegionId) : undefined,
      product_id: filterProductId ? Number(filterProductId) : undefined,
      therapeutic_area_id: filterTherapeuticAreaId ? Number(filterTherapeuticAreaId) : undefined,
      sub_therapy_area_id: filterSubTherapyAreaId ? Number(filterSubTherapyAreaId) : undefined,
      include_inactive: includeInactive,
    });
    setGroups(nextGroups);
    setSelectedGroupId((currentId) => {
      if (currentId && nextGroups.some((group) => group.id === currentId)) {
        return currentId;
      }
      return nextGroups[0]?.id ?? null;
    });
  }, [
    filterGroupType,
    filterProductId,
    filterRegionId,
    filterSubTherapyAreaId,
    filterTherapeuticAreaId,
    includeInactive,
    search,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [
          nextGroups,
          nextUsers,
          nextRegions,
          nextCountries,
          nextBrands,
          nextProducts,
          nextTherapeuticAreas,
          nextSubTherapyAreas,
          nextGroupTypes,
        ] = await Promise.all([
          getUserGroups({ include_inactive: includeInactive }),
          getUsers(),
          getRegions(),
          getCountries(),
          getBrands(),
          getProducts(),
          getTherapeuticAreas(),
          getSubTherapyAreas(),
          getLookupValuesByCategory("USER_GROUP_TYPE").catch(() => []),
        ]);

        if (isMounted) {
          setGroups(nextGroups);
          setSelectedGroupId(nextGroups[0]?.id ?? null);
          setUsers(nextUsers);
          setRegions(nextRegions);
          setCountries(nextCountries);
          setBrands(nextBrands);
          setProducts(nextProducts);
          setTherapeuticAreas(nextTherapeuticAreas);
          setSubTherapyAreas(nextSubTherapyAreas);
          setGroupTypes(nextGroupTypes);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    void loadGroups().catch((error) => setErrorMessage(getApiErrorMessage(error)));
  }, [includeInactive]);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      if (!selectedGroup) {
        setMembers([]);
        return;
      }
      setIsMembersLoading(true);
      try {
        const nextMembers = await getUserGroupMembers(selectedGroup.id);
        if (isMounted) {
          setMembers(nextMembers);
        }
      } catch (error) {
        if (isMounted) {
          setMembers([]);
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsMembersLoading(false);
        }
      }
    }

    void loadMembers();
    return () => {
      isMounted = false;
    };
  }, [selectedGroup?.id]);

  const memberUserIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const addableUsers = users.filter((user) => user.is_active && !memberUserIds.has(user.id));

  const columns = useMemo<DataTableColumn<UserGroup>[]>(
    () => [
      {
        header: "Group",
        className: "min-w-72",
        render: (group) => (
          <div>
            <button
              type="button"
              onClick={() => setSelectedGroupId(group.id)}
              className="text-left font-semibold text-brand-700 hover:text-brand-800"
            >
              {group.name}
            </button>
            <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{group.code}</p>
            {group.description && <p className="mt-2 max-w-md text-sm text-slate-600">{group.description}</p>}
          </div>
        ),
      },
      {
        header: "Type",
        render: (group) => group.group_type || <span className="text-slate-500">Not set</span>,
      },
      {
        header: "Scope",
        className: "min-w-64",
        render: (group) => (
          <div className="space-y-1 text-sm text-slate-700">
            <ScopeLine label="Region" value={group.region_name} />
            <ScopeLine label="Product" value={group.product_name} />
            <ScopeLine label="Therapy" value={group.therapeutic_area_name} />
            <ScopeLine label="Sub-Therapy" value={group.sub_therapy_area_name ?? null} />
          </div>
        ),
      },
      {
        header: "Members",
        render: (group) => <span className="font-semibold text-slate-900">{group.member_count}</span>,
      },
      {
        header: "Status",
        render: (group) => <StatusBadge status={group.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
    ],
    [],
  );

  async function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      await loadGroups();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmitGroup(values: FormState) {
    setIsSubmitting(true);
    setFormErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = toPayload(values);
      if (modalState?.mode === "edit") {
        const updated = await updateUserGroup(modalState.group.id, payload);
        setSuccessMessage(`Updated ${updated.name}.`);
        setModalState(null);
        await loadGroups();
        setSelectedGroupId(updated.id);
      } else {
        const created = await createUserGroup(payload);
        setSuccessMessage(`Created ${created.name}.`);
        setModalState(null);
        await loadGroups();
        setSelectedGroupId(created.id);
      }
    } catch (error) {
      setFormErrorMessage(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(group: UserGroup) {
    if (!window.confirm(`Deactivate ${group.name}? Existing memberships will remain for audit context.`)) {
      return;
    }
    setBusyAction(`deactivate-${group.id}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const deactivated = await deactivateUserGroup(group.id);
      setSuccessMessage(`Deactivated ${deactivated.name}.`);
      await loadGroups();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup || !memberUserId) {
      return;
    }
    setBusyAction("add-member");
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await addUserToGroup(selectedGroup.id, { user_id: Number(memberUserId) });
      setMemberUserId("");
      setMembers(await getUserGroupMembers(selectedGroup.id));
      await loadGroups();
      setSuccessMessage("Member added.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRemoveMember(member: UserGroupMember) {
    if (!selectedGroup) {
      return;
    }
    if (!window.confirm(`Remove ${member.user?.full_name || `user ${member.user_id}`} from this group?`)) {
      return;
    }
    setBusyAction(`remove-${member.user_id}`);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await removeUserFromGroup(selectedGroup.id, member.user_id);
      setMembers(await getUserGroupMembers(selectedGroup.id));
      await loadGroups();
      setSuccessMessage("Member removed.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  if (isLoading && groups.length === 0) {
    return (
      <PageContainer width="wide">
        <LoadingState label="Loading user groups..." rows={5} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Console"
        title="User Groups"
        subtitle="Scope users by team, geography, brand, product, or therapy area while roles continue to control permissions."
        status="ACTIVE"
        statusLabel="Optional Scope"
        primaryAction={
          <button
            type="button"
            onClick={() => {
              setFormErrorMessage(null);
              setModalState({ mode: "create", group: null });
            }}
            className={primaryButtonClass}
          >
            Create Group
          </button>
        }
      />

      {(errorMessage || successMessage) && (
        errorMessage ? (
          <ErrorState message={errorMessage} />
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {successMessage}
          </div>
        )
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Groups" value={groups.length} helperText="Matching current filters" status="info" />
        <KpiCard label="Active Groups" value={groups.filter((group) => group.is_active).length} helperText="Available for routing" status="success" />
        <KpiCard label="Members" value={groups.reduce((count, group) => count + group.member_count, 0)} helperText="Membership assignments" status="neutral" />
      </div>

      <SummaryCard title="Filters" subtitle="Find groups by type or business scope.">
        <form className="grid gap-4 lg:grid-cols-7" onSubmit={(event) => void handleApplyFilters(event)}>
          <FilterField label="Search" htmlFor="group-search">
            <input
              id="group-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Code, name, description"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </FilterField>
          <FilterField label="Group Type" htmlFor="group-type-filter">
            <select
              id="group-type-filter"
              value={filterGroupType}
              onChange={(event) => setFilterGroupType(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All types</option>
              {groupTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Region" htmlFor="region-filter">
            <select
              id="region-filter"
              value={filterRegionId}
              onChange={(event) => setFilterRegionId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Product" htmlFor="product-filter">
            <select
              id="product-filter"
              value={filterProductId}
              onChange={(event) => setFilterProductId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Therapy Area" htmlFor="therapy-filter">
            <select
              id="therapy-filter"
              value={filterTherapeuticAreaId}
              onChange={(event) => setFilterTherapeuticAreaId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All therapy areas</option>
              {therapeuticAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Sub-Therapy" htmlFor="sub-therapy-filter">
            <select
              id="sub-therapy-filter"
              value={filterSubTherapyAreaId}
              onChange={(event) => setFilterSubTherapyAreaId(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All sub-therapies</option>
              {subTherapyAreas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </FilterField>
          <div className="flex items-end gap-2">
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Inactive
            </label>
            <button type="submit" className={secondaryButtonClass}>Apply</button>
          </div>
        </form>
      </SummaryCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SummaryCard title="Group Master" subtitle="User groups are optional scoping records for routing and package targeting.">
          <DataTable
            rows={groups}
            columns={columns}
            getRowKey={(group) => group.id}
            isLoading={isLoading}
            onRowClick={(group) => setSelectedGroupId(group.id)}
            getRowClassName={(group) =>
              group.id === selectedGroup?.id
                ? "bg-brand-50/60 ring-1 ring-inset ring-brand-100"
                : undefined
            }
            loadingLabel="Loading user groups..."
            emptyTitle="No user groups found"
            emptyDescription="Create a group when you are ready to add team, region, product, or reviewer-pool scope."
            renderActions={(group) => (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormErrorMessage(null);
                    setModalState({ mode: "edit", group });
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={!group.is_active || busyAction === `deactivate-${group.id}`}
                  onClick={() => void handleDeactivate(group)}
                  className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === `deactivate-${group.id}` ? "Saving" : "Deactivate"}
                </button>
              </>
            )}
          />
        </SummaryCard>

        <SummaryCard
          title={selectedGroup?.name ?? "Group Detail"}
          subtitle={selectedGroup ? "Scope and member assignments for the selected group." : "Select a group to manage members."}
        >
          {!selectedGroup ? (
            <p className="text-sm text-slate-500">No group selected.</p>
          ) : (
            <div className="space-y-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Code" value={selectedGroup.code} />
                <DetailItem label="Type" value={selectedGroup.group_type || "Not set"} />
                <DetailItem label="Region" value={selectedGroup.region_name || "Any"} />
                <DetailItem label="Country" value={selectedGroup.country_name || "Any"} />
                <DetailItem label="Brand" value={selectedGroup.brand_name || "Any"} />
                <DetailItem label="Product" value={selectedGroup.product_name || "Any"} />
                <DetailItem label="Therapy Area" value={selectedGroup.therapeutic_area_name || "Any"} />
                <DetailItem label="Sub-Therapy" value={selectedGroup.sub_therapy_area_name || "Any"} />
                <DetailItem label="Status" value={<StatusBadge status={selectedGroup.is_active ? "ACTIVE" : "INACTIVE"} />} />
              </dl>

              <form className="rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={(event) => void handleAddMember(event)}>
                <label className="block text-sm font-medium text-slate-700" htmlFor="member-user">
                  Add Member
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <select
                    id="member-user"
                    value={memberUserId}
                    onChange={(event) => setMemberUserId(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="">Select active user</option>
                    {addableUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                    ))}
                  </select>
                  <button type="submit" disabled={!memberUserId || busyAction === "add-member"} className={primaryButtonClass}>
                    {busyAction === "add-member" ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>

              {isMembersLoading ? (
                <LoadingState label="Loading members..." rows={3} />
              ) : members.length === 0 ? (
                <p className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                  No members assigned.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {member.user?.full_name ?? `User ${member.user_id}`}
                        </p>
                        <p className="text-xs text-slate-500">{member.user?.email ?? "Email not loaded"}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busyAction === `remove-${member.user_id}`}
                        onClick={() => void handleRemoveMember(member)}
                        className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SummaryCard>
      </div>

      <UserGroupFormModal
        isOpen={modalState !== null}
        mode={modalState?.mode ?? "create"}
        group={modalState?.group ?? null}
        groupTypes={groupTypes}
        regions={regions}
        countries={countries}
        brands={brands}
        products={products}
        therapeuticAreas={therapeuticAreas}
        subTherapyAreas={subTherapyAreas}
        isSubmitting={isSubmitting}
        submitError={formErrorMessage}
        onClose={() => {
          setFormErrorMessage(null);
          setModalState(null);
        }}
        onSubmit={handleSubmitGroup}
      />
    </PageContainer>
  );
}


type UserGroupFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  group: UserGroup | null;
  groupTypes: LookupValue[];
  regions: Region[];
  countries: Country[];
  brands: Brand[];
  products: Product[];
  therapeuticAreas: TherapeuticArea[];
  subTherapyAreas: SubTherapyArea[];
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (values: FormState) => Promise<void>;
};


function UserGroupFormModal({
  isOpen,
  mode,
  group,
  groupTypes,
  regions,
  countries,
  brands,
  products,
  therapeuticAreas,
  subTherapyAreas,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: UserGroupFormModalProps) {
  const draftKey = isOpen
    ? mode === "create"
      ? "user-group:create"
      : group
        ? `user-group:edit:${group.id}`
        : null
    : null;
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  } = useRedisFormDraft<FormState>(draftKey);
  const [values, setValues] = useState<FormState>(() => initialValues(group));

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const nextInitialValues = initialValues(group);
      setValues(nextInitialValues);

      void loadDraft().then((draft) => {
        if (isMounted && draft) {
          setValues({ ...nextInitialValues, ...draft.payload });
        }
      });
    } else {
      resetDraftState();
    }

    return () => {
      isMounted = false;
    };
  }, [group, isOpen, loadDraft, resetDraftState]);

  function updateField<FieldName extends keyof FormState>(
    fieldName: FieldName,
    value: FormState[FieldName],
  ) {
    setValues((current) => ({ ...current, [fieldName]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.code.trim() || !values.name.trim()) {
      return;
    }
    try {
      await onSubmit(values);
      await clearDraft();
    } catch {
      return;
    }
  }

  async function handleSaveDraft() {
    await saveDraft(values);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-950">
            {mode === "create" ? "Create User Group" : "Edit User Group"}
          </h2>
        </div>

        <form className="space-y-5 px-6 py-5" onSubmit={handleSubmit}>
          {submitError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          )}

          <FormDraftNotice
            state={draftState}
            updatedAt={draftUpdatedAt}
            expiresAt={draftExpiresAt}
            error={draftError}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ModalField label="Code" htmlFor="group-code" required>
              <input
                id="group-code"
                required
                value={values.code}
                onChange={(event) => updateField("code", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </ModalField>
            <ModalField label="Name" htmlFor="group-name" required>
              <input
                id="group-name"
                required
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </ModalField>
          </div>

          <ModalField label="Description" htmlFor="group-description">
            <textarea
              id="group-description"
              rows={3}
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </ModalField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModalField label="Group Type" htmlFor="group-type">
              {groupTypes.length > 0 ? (
                <select
                  id="group-type"
                  value={values.group_type}
                  onChange={(event) => updateField("group_type", event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">No type</option>
                  {groupTypes.map((type) => (
                    <option key={type.id} value={type.code}>{type.label}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    id="group-type"
                    value={values.group_type}
                    onChange={(event) => updateField("group_type", event.target.value)}
                    placeholder="Manual group type"
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    No group types configured. Admin can add them in Lookup Master.
                  </p>
                </>
              )}
            </ModalField>
            <label className="mt-7 flex h-10 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => updateField("is_active", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Active
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Region" id="group-region" value={values.region_id} options={regions} onChange={(value) => updateField("region_id", value)} />
            <SelectField label="Country" id="group-country" value={values.country_id} options={countries} onChange={(value) => updateField("country_id", value)} />
            <SelectField label="Brand" id="group-brand" value={values.brand_id} options={brands} onChange={(value) => updateField("brand_id", value)} />
            <SelectField label="Product" id="group-product" value={values.product_id} options={products} onChange={(value) => updateField("product_id", value)} />
            <SelectField label="Therapeutic Area" id="group-therapy" value={values.therapeutic_area_id} options={therapeuticAreas} onChange={(value) => updateField("therapeutic_area_id", value)} />
            <SelectField label="Sub-Therapy" id="group-sub-therapy" value={values.sub_therapy_area_id} options={subTherapyAreas} onChange={(value) => updateField("sub_therapy_area_id", value)} />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={isSubmitting || draftState === "saving"}
              className={secondaryButtonClass}
            >
              {draftState === "saving" ? "Saving draft..." : "Save Draft"}
            </button>
            <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting ? "Saving..." : mode === "create" ? "Create Group" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


type SelectableOption = {
  id: number;
  name: string;
};


type SelectFieldProps<T extends SelectableOption> = {
  label: string;
  id: string;
  value: string;
  options: T[];
  onChange: (value: string) => void;
};


function SelectField<T extends SelectableOption>({ label, id, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <ModalField label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </ModalField>
  );
}


type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
};


function ModalField({ label, htmlFor, required = false, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
    </div>
  );
}


function FilterField({ label, htmlFor, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}


type DetailItemProps = {
  label: string;
  value: ReactNode;
};


function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}


function ScopeLine({ label, value }: { label: string; value: string | null }) {
  return (
    <p>
      <span className="font-semibold text-slate-500">{label}:</span>{" "}
      {value || <span className="text-slate-500">Any</span>}
    </p>
  );
}

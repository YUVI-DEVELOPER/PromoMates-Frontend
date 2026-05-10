import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { getApprovedMaterials } from "../../api/approvedMaterials";
import {
  addMaterialToPackage,
  addGroupToPackage,
  getDistributionPackage,
  getDistributionPackageHistory,
  getPackageMaterials,
  getSalesRepAccess,
  releaseDistributionPackage,
  removeGroupFromPackage,
  removeMaterialFromPackage,
  updatePackageMaterial,
  withdrawDistributionPackage,
} from "../../api/distribution";
import { getUserGroupOptions } from "../../api/userGroups";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge, getStatusLabel } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { ApprovedMaterial } from "../../types/approvedMaterial";
import type {
  DistributionPackage,
  DistributionPackageHistory,
  PackageMaterial,
  SalesRepAccess,
} from "../../types/distribution";
import type { UserGroupOption } from "../../types/userGroup";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";
const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60";


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function canEditMaterials(packageItem: DistributionPackage | null): boolean {
  return packageItem?.status === "DRAFT" || packageItem?.status === "SCHEDULED";
}


export function DistributionPackageDetail() {
  const { packageId } = useParams();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [packageItem, setPackageItem] = useState<DistributionPackage | null>(null);
  const [materials, setMaterials] = useState<PackageMaterial[]>([]);
  const [history, setHistory] = useState<DistributionPackageHistory[]>([]);
  const [accessEvents, setAccessEvents] = useState<SalesRepAccess[]>([]);
  const [approvedMaterials, setApprovedMaterials] = useState<ApprovedMaterial[]>([]);
  const [groupOptions, setGroupOptions] = useState<UserGroupOption[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [usageNotes, setUsageNotes] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [materialErrorMessage, setMaterialErrorMessage] = useState<string | null>(null);

  const canManage = hasPermission(PERMISSIONS.CREATE_DISTRIBUTION);
  const canRelease = hasPermission(PERMISSIONS.RELEASE_DISTRIBUTION);
  const canWithdraw = hasPermission(PERMISSIONS.WITHDRAW_DISTRIBUTION);
  const canChangeMaterials = canManage && canEditMaterials(packageItem);

  const fetchPackage = useCallback(async () => {
    if (!packageId) {
      setErrorMessage("Distribution package not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [nextPackage, nextMaterials, nextHistory, nextAccessEvents, nextGroupOptions] = await Promise.all([
        getDistributionPackage(packageId),
        getPackageMaterials(packageId),
        getDistributionPackageHistory(packageId),
        getSalesRepAccess({ package_id: packageId }),
        getUserGroupOptions().catch(() => []),
      ]);
      setPackageItem(nextPackage);
      setMaterials(nextMaterials);
      setHistory(nextHistory);
      setAccessEvents(nextAccessEvents.slice(0, 10));
      setGroupOptions(nextGroupOptions);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setPackageItem(null);
      setMaterials([]);
      setHistory([]);
      setAccessEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [packageId]);

  const fetchApprovedMaterials = useCallback(async () => {
    setMaterialErrorMessage(null);
    try {
      const response = await getApprovedMaterials({
        status: "ACTIVE",
        valid_only: true,
        search: materialSearch.trim() || undefined,
        page_size: 10,
      });
      setApprovedMaterials(response.items);
    } catch (error) {
      setMaterialErrorMessage(getApiErrorMessage(error));
    }
  }, [materialSearch]);

  useEffect(() => {
    void fetchPackage();
  }, [fetchPackage]);

  useEffect(() => {
    if (canChangeMaterials) {
      void fetchApprovedMaterials();
    }
  }, [canChangeMaterials, fetchApprovedMaterials]);

  const materialIdsInPackage = useMemo(
    () => new Set(materials.map((material) => material.material_id)),
    [materials],
  );
  const selectableMaterials = approvedMaterials.filter((material) => !materialIdsInPackage.has(material.id));
  const targetGroupIds = useMemo(
    () => new Set((packageItem?.target_groups ?? []).map((group) => group.id)),
    [packageItem?.target_groups],
  );
  const selectableGroups = groupOptions.filter((group) => !targetGroupIds.has(group.id));

  async function handleRelease() {
    if (!packageId) {
      return;
    }
    const comment = window.prompt("Release comment", "Released to sales users.")?.trim() || null;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await releaseDistributionPackage(packageId, { comment });
      setSuccessMessage("Package released.");
      await fetchPackage();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleWithdraw() {
    if (!packageId) {
      return;
    }
    const reason = window.prompt("Withdrawal reason")?.trim();
    if (!reason) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await withdrawDistributionPackage(packageId, reason);
      setSuccessMessage("Package withdrawn.");
      await fetchPackage();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleAddMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!packageId || !selectedMaterialId) {
      return;
    }
    setIsActionLoading(true);
    setMaterialErrorMessage(null);
    try {
      await addMaterialToPackage(packageId, {
        material_id: selectedMaterialId,
        sort_order: Number(sortOrder) || 0,
        usage_notes: usageNotes.trim() || null,
      });
      setSelectedMaterialId("");
      setUsageNotes("");
      setSortOrder("0");
      setSuccessMessage("Material added to package.");
      await Promise.all([fetchPackage(), fetchApprovedMaterials()]);
    } catch (error) {
      setMaterialErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleUpdateMaterial(packageMaterial: PackageMaterial) {
    if (!packageId) {
      return;
    }
    const nextOrder = window.prompt("Sort order", String(packageMaterial.sort_order));
    if (nextOrder === null) {
      return;
    }
    const nextNotes = window.prompt("Usage notes", packageMaterial.usage_notes ?? "") ?? packageMaterial.usage_notes;
    setIsActionLoading(true);
    setMaterialErrorMessage(null);
    try {
      await updatePackageMaterial(packageId, packageMaterial.material_id, {
        sort_order: Number(nextOrder) || 0,
        usage_notes: nextNotes?.trim() || null,
      });
      setSuccessMessage("Package material updated.");
      await fetchPackage();
    } catch (error) {
      setMaterialErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleRemoveMaterial(packageMaterial: PackageMaterial) {
    if (!packageId) {
      return;
    }
    if (!window.confirm(`Remove ${packageMaterial.material_code || "this material"} from the package?`)) {
      return;
    }
    setIsActionLoading(true);
    setMaterialErrorMessage(null);
    try {
      await removeMaterialFromPackage(packageId, packageMaterial.material_id);
      setSuccessMessage("Material removed.");
      await Promise.all([fetchPackage(), fetchApprovedMaterials()]);
    } catch (error) {
      setMaterialErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleAddGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!packageId || !selectedGroupId) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await addGroupToPackage(packageId, Number(selectedGroupId));
      setSelectedGroupId("");
      setSuccessMessage("Target group added.");
      await fetchPackage();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleRemoveGroup(group: UserGroupOption) {
    if (!packageId) {
      return;
    }
    if (!window.confirm(`Remove target group ${group.name}?`)) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      await removeGroupFromPackage(packageId, group.id);
      setSuccessMessage("Target group removed.");
      await fetchPackage();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  }

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Distribution"
        title={packageItem?.package_name || "Distribution Package"}
        subtitle={packageItem?.usage_instructions || "Package release, materials, history, and access telemetry."}
        status={packageItem?.status || "DRAFT"}
        metadata={[
          { label: "Materials", value: materials.length },
          { label: "Release Date", value: formatDate(packageItem?.release_date) },
          { label: "Expiry Date", value: formatDate(packageItem?.expiry_date) },
          { label: "Created By", value: packageItem?.created_by_name || "Not set" },
        ]}
        primaryAction={
          <Link to="/distribution" className={secondaryButtonClass}>
            Back to Distribution
          </Link>
        }
      />

      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}
      {errorMessage && <ErrorState message={errorMessage} />}

      {isLoading ? (
        <LoadingState label="Loading distribution package..." rows={4} />
      ) : packageItem ? (
        <>
          <SummaryCard
            title="Package Summary"
            subtitle="Release windows and sales availability controls."
            action={
              <div className="flex flex-wrap gap-2">
                {canRelease && ["DRAFT", "SCHEDULED"].includes(packageItem.status) && (
                  <button
                    type="button"
                    disabled={isActionLoading || materials.length === 0}
                    onClick={() => void handleRelease()}
                    className={primaryButtonClass}
                  >
                    Release Package
                  </button>
                )}
                {canWithdraw && ["DRAFT", "SCHEDULED", "RELEASED"].includes(packageItem.status) && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => void handleWithdraw()}
                    className={dangerButtonClass}
                  >
                    Withdraw Package
                  </button>
                )}
              </div>
            }
          >
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Status" value={<StatusBadge status={packageItem.status} />} />
              <DetailItem label="Campaign" value={packageItem.campaign_name || "No campaign"} />
              <DetailItem label="Released By" value={packageItem.released_by_name || "Not released"} />
              <DetailItem label="Available Now" value={packageItem.is_currently_available ? "Yes" : "No"} />
              <DetailItem label="Released At" value={formatDateTime(packageItem.released_at)} />
              <DetailItem label="Withdrawn At" value={formatDateTime(packageItem.withdrawn_at)} />
              <DetailItem label="Withdrawal Reason" value={packageItem.withdrawal_reason || "Not set"} />
              <DetailItem
                label="Targets"
                value={
                  packageItem.target_groups?.length
                    ? `${packageItem.target_groups.length} group(s)`
                    : packageItem.target_user_ids?.length
                    ? `${packageItem.target_user_ids.length} user(s)`
                    : packageItem.target_region_ids?.length
                      ? `${packageItem.target_region_ids.length} region(s)`
                      : "All released users"
                }
              />
            </dl>
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target Groups</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {packageItem.target_groups.length === 0 ? (
                      <span className="text-sm text-slate-600">No target groups. Released materials remain visible by existing permission rules.</span>
                    ) : (
                      packageItem.target_groups.map((group) => (
                        <span
                          key={group.id}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {group.name}
                          {canChangeMaterials && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveGroup(group)}
                              className="text-rose-700 hover:text-rose-800"
                              aria-label={`Remove ${group.name}`}
                              title={`Remove ${group.name}`}
                            >
                              x
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {canChangeMaterials && (
                  <form className="flex min-w-72 gap-2" onSubmit={(event) => void handleAddGroup(event)}>
                    <select
                      value={selectedGroupId}
                      onChange={(event) => setSelectedGroupId(event.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">Add group</option>
                      {selectableGroups.map((group) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                    <button type="submit" disabled={!selectedGroupId || isActionLoading} className={primaryButtonClass}>
                      Add
                    </button>
                  </form>
                )}
              </div>
            </div>
          </SummaryCard>

          <SummaryCard
            title="Package Materials"
            subtitle="Only ACTIVE, non-expired approved materials can be added before release."
          >
            {materialErrorMessage && <ErrorState message={materialErrorMessage} />}

            {canChangeMaterials && (
              <form
                className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
                onSubmit={(event) => void handleAddMaterial(event)}
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
                  <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="material-search">
                      Search active approved materials
                    </label>
                    <input
                      id="material-search"
                      value={materialSearch}
                      onChange={(event) => setMaterialSearch(event.target.value)}
                      placeholder="Search MAT code, title, MLR code..."
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="material-select">
                      Material
                    </label>
                    <select
                      id="material-select"
                      value={selectedMaterialId}
                      onChange={(event) => setSelectedMaterialId(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">Select material</option>
                      {selectableMaterials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.material_code} - {material.material_title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700" htmlFor="sort-order">
                      Sort Order
                    </label>
                    <input
                      id="sort-order"
                      type="number"
                      min={0}
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="usage-notes">
                    Usage Notes
                  </label>
                  <textarea
                    id="usage-notes"
                    value={usageNotes}
                    rows={3}
                    onChange={(event) => setUsageNotes(event.target.value)}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={isActionLoading || !selectedMaterialId}
                    className={primaryButtonClass}
                  >
                    Add Material
                  </button>
                </div>
              </form>
            )}

            {materials.length === 0 ? (
              <EmptyState
                title="No materials in this package"
                description="Add at least one ACTIVE approved material before release."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order</th>
                      <th className="min-w-72 px-4 py-3 font-semibold">Material</th>
                      <th className="px-4 py-3 font-semibold">MLR Code</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Valid Until</th>
                      <th className="min-w-64 px-4 py-3 font-semibold">Usage Notes</th>
                      {canChangeMaterials && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {materials.map((material) => (
                      <tr key={material.material_id} className="align-top">
                        <td className="px-4 py-4 text-slate-600">{material.sort_order}</td>
                        <td className="px-4 py-4">
                          <Link
                            to={`/approved-materials/${material.material_id}`}
                            className="font-semibold text-brand-700 hover:text-brand-800"
                          >
                            {material.material_code || "Material"}
                          </Link>
                          <p className="mt-1 text-sm text-slate-700">{material.material_title || "Untitled"}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{material.mlr_code || "Not set"}</td>
                        <td className="px-4 py-4">{material.status && <StatusBadge status={material.status} />}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(material.valid_until)}</td>
                        <td className="px-4 py-4 text-slate-600">{material.usage_notes || "No notes"}</td>
                        {canChangeMaterials && (
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleUpdateMaterial(material)}
                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveMaterial(material)}
                                className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SummaryCard>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SummaryCard title="Recent Access" subtitle="Recent sales material usage from this package.">
              {accessEvents.length === 0 ? (
                <p className="text-sm text-slate-500">No sales access recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {accessEvents.map((event) => (
                    <article key={event.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={event.access_type} />
                        <span className="text-sm font-semibold text-slate-900">{event.material_code}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {event.user_name || `User ${event.user_id}`} at {formatDateTime(event.accessed_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Device: {event.device_type || "Not set"} | Terms: {event.acknowledged_terms ? "Acknowledged" : "Not acknowledged"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </SummaryCard>

            <SummaryCard title="History" subtitle="Package lifecycle and material changes.">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500">No history yet.</p>
              ) : (
                <ol className="space-y-3">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.to_status && <StatusBadge status={entry.to_status} />}
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {entry.action.split("_").join(" ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {entry.from_status ? getStatusLabel(entry.from_status) : "Start"}
                        {" -> "}
                        {entry.to_status ? getStatusLabel(entry.to_status) : "No Status Change"}
                      </p>
                      {entry.comment && <p className="mt-1 text-sm text-slate-600">{entry.comment}</p>}
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(entry.created_at)} by {entry.changed_by?.full_name || `User ${entry.changed_by_id}`}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </SummaryCard>
          </div>
        </>
      ) : (
        <EmptyState title="Distribution package not found" />
      )}
    </PageContainer>
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

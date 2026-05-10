import { useCallback, useEffect, useState } from "react";

import {
  getSalesRepMaterials,
  recordSalesRepAccess,
} from "../../api/distribution";
import { getLookupValuesByCategory } from "../../api/lookups";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import { useActiveTabRefreshNonce } from "../../context/WorkspaceTabsContext";
import type { PackageMaterial, SalesMaterialAccessType } from "../../types/distribution";
import type { LookupValue } from "../../types/lookup";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


export function SalesMaterials() {
  const { hasPermission, user } = useAuth();
  const refreshNonce = useActiveTabRefreshNonce();
  const [materials, setMaterials] = useState<PackageMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deviceTypeValues, setDeviceTypeValues] = useState<LookupValue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canView = hasPermission(PERMISSIONS.ACCESS_SALES_MATERIALS);

  const fetchMaterials = useCallback(async (background = false) => {
    if (!canView) {
      setMaterials([]);
      setIsLoading(false);
      return;
    }

    if (!background) {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const nextMaterials = await getSalesRepMaterials();
      setMaterials(nextMaterials);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    void fetchMaterials(false);
  }, [fetchMaterials]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void fetchMaterials(true);
    }
  }, [refreshNonce]);

  useEffect(() => {
    let isMounted = true;

    async function loadDeviceTypes() {
      try {
        const values = await getLookupValuesByCategory("DEVICE_TYPE");
        if (isMounted) {
          setDeviceTypeValues(values);
        }
      } catch {
        if (isMounted) {
          setDeviceTypeValues([]);
        }
      }
    }

    void loadDeviceTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleAccess(material: PackageMaterial, accessType: SalesMaterialAccessType) {
    if (!canView) {
      return;
    }

    setActionId(`${material.package_id}-${material.material_id}-${accessType}`);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await recordSalesRepAccess(material.material_id, {
        package_id: material.package_id,
        access_type: accessType,
        acknowledged_terms: true,
        device_type: deviceTypeValues[0]?.code ?? null,
      });
      setSuccessMessage(
        accessType === "DOWNLOAD"
          ? "Download access recorded. File delivery will use existing asset download flow."
          : `${accessType.toLowerCase()} access recorded.`,
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Sales Enablement"
        title="Sales Materials"
        subtitle="Released package materials available for sales use. Every view, download, and share is tracked."
        status="RELEASED"
        statusLabel="Available Materials"
        metadata={[
          { label: "Available Cards", value: materials.length },
          { label: "Packages", value: new Set(materials.map((material) => material.package_id)).size },
          { label: "Current User", value: user?.full_name || "Signed in" },
        ]}
      />

      {!canView && (
        <ErrorState message="Sales Materials requires CAN_ACCESS_SALES_MATERIALS permission." />
      )}
      {errorMessage && <ErrorState message={errorMessage} />}
      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Loading sales materials..." rows={4} />
      ) : materials.length === 0 ? (
        <EmptyState
          title="No released materials available"
          description="Ask your publisher to release a distribution package with approved materials."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <SummaryCard
              key={`${material.package_id}-${material.material_id}`}
              title={material.material_code || "Material"}
              subtitle={material.package_name || "Released package"}
              action={material.status ? <StatusBadge status={material.status} /> : undefined}
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{material.material_title || "Untitled"}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {material.package_usage_instructions || "Use according to approved package instructions."}
                  </p>
                  {material.usage_notes && (
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {material.usage_notes}
                    </p>
                  )}
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <DetailItem label="MLR Code" value={material.mlr_code || "Not set"} />
                  <DetailItem label="Valid Until" value={formatDate(material.valid_until)} />
                  <DetailItem label="Package Status" value={material.package_status || "Released"} />
                  <DetailItem label="Sort Order" value={String(material.sort_order)} />
                </dl>

                <div className="grid gap-2 sm:grid-cols-3">
                  {(["VIEW", "DOWNLOAD", "SHARE"] as SalesMaterialAccessType[]).map((accessType) => {
                    const currentActionId = `${material.package_id}-${material.material_id}-${accessType}`;
                    return (
                      <button
                        key={accessType}
                        type="button"
                        disabled={actionId === currentActionId}
                        onClick={() => void handleAccess(material, accessType)}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionId === currentActionId ? "Recording..." : accessType.charAt(0) + accessType.slice(1).toLowerCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </SummaryCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}


type DetailItemProps = {
  label: string;
  value: string;
};


function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-950">{value}</dd>
    </div>
  );
}

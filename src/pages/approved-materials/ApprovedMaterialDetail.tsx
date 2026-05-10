import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getApprovedMaterial,
  getApprovedMaterialHistory,
  withdrawApprovedMaterial,
} from "../../api/approvedMaterials";
import { getApprovedMaterialPackages } from "../../api/distribution";
import { ApprovedMaterialPanel } from "../../components/requests/ApprovedMaterialPanel";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { ApprovedMaterial, ApprovedMaterialHistory } from "../../types/approvedMaterial";
import type { DistributionPackage } from "../../types/distribution";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


const buttonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


export function ApprovedMaterialDetail() {
  const { materialId } = useParams();
  const { hasPermission } = useAuth();
  const [material, setMaterial] = useState<ApprovedMaterial | null>(null);
  const [history, setHistory] = useState<ApprovedMaterialHistory[]>([]);
  const [packages, setPackages] = useState<DistributionPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyErrorMessage, setHistoryErrorMessage] = useState<string | null>(null);

  const canWithdraw = hasPermission(PERMISSIONS.MANAGE_APPROVED_MATERIALS);

  const fetchMaterial = useCallback(async () => {
    if (!materialId) {
      setErrorMessage("Approved material not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHistoryErrorMessage(null);

    try {
      const [nextMaterial, nextHistory, nextPackages] = await Promise.all([
        getApprovedMaterial(materialId),
        getApprovedMaterialHistory(materialId),
        getApprovedMaterialPackages(materialId),
      ]);
      setMaterial(nextMaterial);
      setHistory(nextHistory);
      setPackages(nextPackages);
    } catch (error) {
      setMaterial(null);
      setHistory([]);
      setPackages([]);
      const message = getApiErrorMessage(error);
      setErrorMessage(message);
      setHistoryErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    void fetchMaterial();
  }, [fetchMaterial]);

  async function handleWithdraw(reason: string) {
    if (!materialId) {
      return;
    }

    setIsWithdrawing(true);
    setErrorMessage(null);

    try {
      await withdrawApprovedMaterial(materialId, reason);
      await fetchMaterial();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Approved Materials"
        title={material?.material_code || "Approved Material"}
        subtitle={material?.material_title || "Final approved promotional material detail."}
        status={material?.status || "ACTIVE"}
        metadata={[
          { label: "Request", value: material?.request_number || "Not set" },
          { label: "Approval Date", value: formatDate(material?.approval_date) },
          { label: "Valid Until", value: formatDate(material?.valid_until) },
          { label: "MLR Code", value: material?.mlr_code || material?.compliance_mlr_code || "Not set" },
        ]}
        primaryAction={
          <Link to="/approved-materials" className={buttonClass}>
            Back to Approved Materials
          </Link>
        }
        secondaryAction={
          material ? (
            <Link to={`/requests/${material.request_id}`} className={buttonClass}>
              Open Request
            </Link>
          ) : undefined
        }
      />

      {errorMessage && <ErrorState message={errorMessage} />}

      <ApprovedMaterialPanel
        material={material}
        history={history}
        isLoading={isLoading}
        historyErrorMessage={historyErrorMessage}
        canWithdraw={canWithdraw}
        isActionLoading={isWithdrawing}
        onWithdraw={handleWithdraw}
        title="Approved Material Detail"
        subtitle="Source, validity, lock state, and complete status history."
      />

      <SummaryCard
        title="Distribution Packages"
        subtitle="Packages that include this approved material for sales release."
      >
        {packages.length === 0 ? (
          <EmptyState
            title="Not included in any distribution package"
            description="Add this material to a package from the Distribution dashboard."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((packageItem) => (
              <Link
                key={packageItem.id}
                to={`/distribution/${packageItem.id}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-100 hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      Distribution Package
                    </p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-950">{packageItem.package_name}</h4>
                  </div>
                  <StatusBadge status={packageItem.status} />
                </div>
                <dl className="mt-4 grid gap-2 text-sm">
                  <DetailItem label="Release" value={formatDate(packageItem.release_date)} />
                  <DetailItem label="Expiry" value={formatDate(packageItem.expiry_date)} />
                  <DetailItem label="Available" value={packageItem.is_currently_available ? "Yes" : "No"} />
                </dl>
              </Link>
            ))}
          </div>
        )}
      </SummaryCard>
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
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}

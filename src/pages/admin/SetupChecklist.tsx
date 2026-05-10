import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getSetupChecklist } from "../../api/setup";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { SetupChecklistItem } from "../../types/setup";
import { getApiErrorMessage } from "../../utils/apiError";


const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


export function SetupChecklist() {
  const [items, setItems] = useState<SetupChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadChecklist() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const nextItems = await getSetupChecklist();
        if (isMounted) {
          setItems(nextItems);
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

    void loadChecklist();

    return () => {
      isMounted = false;
    };
  }, []);

  const completeCount = useMemo(
    () => items.filter((item) => item.is_complete).length,
    [items],
  );
  const requiredMissingCount = items.filter((item) => item.is_required && !item.is_complete).length;
  const recommendedMissingCount = items.filter((item) => !item.is_required && !item.is_complete).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Setup"
        title="Setup Checklist"
        subtitle="Confirm the minimum configuration needed before running a real manual lifecycle test."
        status={requiredMissingCount === 0 && items.length > 0 ? "COMPLETED" : "WARNING"}
        statusLabel={requiredMissingCount === 0 && items.length > 0 ? "Required Setup Complete" : "Required Setup Missing"}
        metadata={[
          { label: "Completed", value: completeCount },
          { label: "Required Missing", value: requiredMissingCount },
          { label: "Recommended Missing", value: recommendedMissingCount },
          { label: "Total Checks", value: items.length },
        ]}
      />

      {errorMessage && <ErrorState message={errorMessage} />}

      {isLoading ? (
        <LoadingState label="Loading setup checklist..." rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Completed" value={completeCount} helperText="Ready for manual testing" status="success" />
            <KpiCard label="Required Missing" value={requiredMissingCount} helperText="Needs admin attention" status={requiredMissingCount > 0 ? "warning" : "neutral"} />
            <KpiCard label="Progress" value={`${completeCount}/${items.length}`} helperText="Required configuration checks" status="info" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.key}
                className={[
                  "rounded-lg border bg-white p-4 shadow-sm",
                  item.is_complete ? "border-emerald-200" : item.is_required ? "border-amber-200" : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{item.label}</h3>
                    <p className="mt-2 text-xs text-slate-500">Matching records: {item.count}</p>
                    {!item.is_required && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">Recommended production setup</p>
                    )}
                  </div>
                  <StatusBadge
                    status={item.is_complete ? "COMPLETED" : item.is_required ? "WARNING" : "PENDING"}
                    label={item.is_complete ? "Complete" : item.is_required ? "Missing" : "Recommended"}
                  />
                </div>
                <div className="mt-4">
                  <Link to={item.action_path} className={secondaryButtonClass}>
                    {item.action_label}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

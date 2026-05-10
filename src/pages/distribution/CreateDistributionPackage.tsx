import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createDistributionPackage } from "../../api/distribution";
import { getCampaigns, getRegions } from "../../api/masterData";
import { getUserGroupOptions } from "../../api/userGroups";
import { ErrorState } from "../../components/ui/ErrorState";
import { FormDraftNotice } from "../../components/ui/FormDraftNotice";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { useAuth } from "../../context/AuthContext";
import type { DistributionPackageCreatePayload } from "../../types/distribution";
import type { Campaign, Region } from "../../types/masterData";
import type { UserGroupOption } from "../../types/userGroup";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { AccessDenied } from "../AccessDenied";


const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";

type FormState = {
  package_name: string;
  campaign_id: string;
  target_region_ids: string[];
  target_group_ids: string[];
  release_date: string;
  expiry_date: string;
  usage_instructions: string;
};


export function CreateDistributionPackage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [form, setForm] = useState<FormState>({
    package_name: "",
    campaign_id: "",
    target_region_ids: [],
    target_group_ids: [],
    release_date: "",
    expiry_date: "",
    usage_instructions: "",
  });
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canCreate = hasPermission(PERMISSIONS.CREATE_DISTRIBUTION);
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useRedisFormDraft<FormState>("distribution-package:create");

  useEffect(() => {
    let isMounted = true;

    async function fetchRefs() {
      setIsLoadingRefs(true);
      setErrorMessage(null);
      try {
        const [nextCampaigns, nextRegions, nextGroups] = await Promise.all([
          getCampaigns(),
          getRegions(),
          getUserGroupOptions().catch(() => []),
        ]);
        if (isMounted) {
          setCampaigns(nextCampaigns);
          setRegions(nextRegions);
          setGroups(nextGroups);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingRefs(false);
        }
      }
    }

    void fetchRefs();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void loadDraft().then((draft) => {
      if (isMounted && draft) {
        setForm((currentForm) => ({ ...currentForm, ...draft.payload }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadDraft]);

  function updateField<FieldName extends keyof FormState>(fieldName: FieldName, value: FormState[FieldName]) {
    setForm((currentForm) => ({ ...currentForm, [fieldName]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: DistributionPackageCreatePayload = {
      package_name: form.package_name.trim(),
      campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
      target_region_ids: form.target_region_ids.length
        ? form.target_region_ids.map((value) => Number(value))
        : null,
      group_ids: form.target_group_ids.length
        ? form.target_group_ids.map((value) => Number(value))
        : null,
      release_date: form.release_date || null,
      expiry_date: form.expiry_date || null,
      usage_instructions: form.usage_instructions.trim() || null,
    };

    try {
      const distributionPackage = await createDistributionPackage(payload);
      await clearDraft();
      navigate(`/distribution/${distributionPackage.id}`, {
        state: { successMessage: "Distribution package created." },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    await saveDraft(form);
  }

  if (!canCreate) {
    return <AccessDenied />;
  }

  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Distribution"
        title="Create Distribution Package"
        subtitle="Prepare a governed bundle of final approved materials before release to sales users."
        status="DRAFT"
        secondaryAction={
          <Link to="/distribution" className={secondaryButtonClass}>
            Back to Distribution
          </Link>
        }
      />

      {errorMessage && <ErrorState message={errorMessage} />}

      <SummaryCard
        title="Package Setup"
        subtitle="Use target groups when a released package should be visible only to a business team or sales scope."
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FormDraftNotice
            state={draftState}
            updatedAt={draftUpdatedAt}
            expiresAt={draftExpiresAt}
            error={draftError}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Package Name" htmlFor="package-name" required>
              <input
                id="package-name"
                required
                value={form.package_name}
                onChange={(event) => updateField("package_name", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </Field>

            <Field label="Campaign" htmlFor="campaign">
              <select
                id="campaign"
                value={form.campaign_id}
                disabled={isLoadingRefs}
                onChange={(event) => updateField("campaign_id", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">No campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Release Date" htmlFor="release-date">
              <input
                id="release-date"
                type="date"
                value={form.release_date}
                onChange={(event) => updateField("release_date", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </Field>

            <Field label="Expiry Date" htmlFor="expiry-date">
              <input
                id="expiry-date"
                type="date"
                value={form.expiry_date}
                onChange={(event) => updateField("expiry_date", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </div>

          <Field label="Target Regions" htmlFor="target-regions">
            <select
              id="target-regions"
              multiple
              value={form.target_region_ids}
              disabled={isLoadingRefs}
              onChange={(event) =>
                updateField(
                  "target_region_ids",
                  Array.from(event.target.selectedOptions).map((option) => option.value),
                )
              }
              className="mt-2 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Hold Ctrl/Cmd to select multiple. Region matching will activate once sales users carry region assignments.
            </p>
          </Field>

          <Field label="Target Groups" htmlFor="target-groups">
            <select
              id="target-groups"
              multiple
              value={form.target_group_ids}
              disabled={isLoadingRefs}
              onChange={(event) =>
                updateField(
                  "target_group_ids",
                  Array.from(event.target.selectedOptions).map((option) => option.value),
                )
              }
              className="mt-2 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Leave empty for the existing all-sales release behavior.
            </p>
          </Field>

          <Field label="Usage Instructions" htmlFor="usage-instructions">
            <textarea
              id="usage-instructions"
              value={form.usage_instructions}
              rows={5}
              onChange={(event) => updateField("usage_instructions", event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <Link to="/distribution" className={secondaryButtonClass}>
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={isSubmitting || draftState === "saving"}
              className={secondaryButtonClass}
            >
              {draftState === "saving" ? "Saving draft..." : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create Package"}
            </button>
          </div>
        </form>
      </SummaryCard>
    </PageContainer>
  );
}


type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
};


function Field({ label, htmlFor, required = false, children }: FieldProps) {
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

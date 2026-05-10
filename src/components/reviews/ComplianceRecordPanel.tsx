import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";

import { getLookupValuesByCategory } from "../../api/lookups";
import type {
  LegalComplianceRecord,
  LegalComplianceRecordCreatePayload,
  LegalComplianceRecordIssueCodePayload,
  LegalComplianceRecordUpdatePayload,
  LegalComplianceStatus,
} from "../../types/legalCompliance";
import {
  legalComplianceDecisionLabels,
  legalComplianceStatusLabels,
} from "../../types/legalCompliance";
import type { LookupValue } from "../../types/lookup";
import { EmptyState } from "../ui/EmptyState";
import { SummaryCard } from "../ui/SummaryCard";


type ComplianceRecordPanelProps = {
  record: LegalComplianceRecord | null;
  contentVersionId?: string | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  title?: string;
  subtitle?: ReactNode;
  canCreate?: boolean;
  canEditChecklist?: boolean;
  canIssueCode?: boolean;
  defaultCreatePayload?: Partial<LegalComplianceRecordCreatePayload>;
  onCreate?: (payload: LegalComplianceRecordCreatePayload) => Promise<void> | void;
  onSave?: (recordId: string, payload: LegalComplianceRecordUpdatePayload) => Promise<void> | void;
  onIssueCode?: (recordId: string, payload: LegalComplianceRecordIssueCodePayload) => Promise<void> | void;
};


type ChecklistState = {
  claims_verified: boolean;
  fair_balance_present: boolean;
  pi_references_accurate: boolean;
  safety_information_included: boolean;
  black_box_warning_included: boolean;
  off_label_risk_flag: boolean;
  country_specific_reqs_met: boolean;
  references_verified: boolean;
  mandatory_annotations_resolved: boolean;
};


const secondaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";

const statusBadgeBase = "inline-flex rounded-md border px-2 py-1 text-xs font-semibold";


function getStatusBadgeClass(status: LegalComplianceStatus): string {
  if (status === "CODE_ISSUED") {
    return `${statusBadgeBase} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }
  if (status === "READY_FOR_CODE") {
    return `${statusBadgeBase} border-sky-200 bg-sky-50 text-sky-700`;
  }
  if (status === "CHECKLIST_IN_PROGRESS") {
    return `${statusBadgeBase} border-amber-200 bg-amber-50 text-amber-800`;
  }
  if (status === "WITHDRAWN") {
    return `${statusBadgeBase} border-rose-200 bg-rose-50 text-rose-700`;
  }
  if (status === "SUPERSEDED") {
    return `${statusBadgeBase} border-violet-200 bg-violet-50 text-violet-700`;
  }
  return `${statusBadgeBase} border-slate-200 bg-slate-100 text-slate-700`;
}


function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


function initialChecklist(record: LegalComplianceRecord | null): ChecklistState {
  return {
    claims_verified: record?.claims_verified ?? false,
    fair_balance_present: record?.fair_balance_present ?? false,
    pi_references_accurate: record?.pi_references_accurate ?? false,
    safety_information_included: record?.safety_information_included ?? false,
    black_box_warning_included: record?.black_box_warning_included ?? false,
    off_label_risk_flag: record?.off_label_risk_flag ?? false,
    country_specific_reqs_met: record?.country_specific_reqs_met ?? false,
    references_verified: record?.references_verified ?? false,
    mandatory_annotations_resolved: record?.mandatory_annotations_resolved ?? false,
  };
}


export function ComplianceRecordPanel({
  record,
  contentVersionId = null,
  isLoading = false,
  errorMessage = null,
  title = "Compliance / MLR Code",
  subtitle = "Track the compliance checklist, MLR decision, and code issuance.",
  canCreate = false,
  canEditChecklist = false,
  canIssueCode = false,
  defaultCreatePayload = {},
  onCreate,
  onSave,
  onIssueCode,
}: ComplianceRecordPanelProps) {
  const [checklist, setChecklist] = useState<ChecklistState>(() => initialChecklist(record));
  const [regulatoryFramework, setRegulatoryFramework] = useState(record?.regulatory_framework ?? "");
  const [complianceNotes, setComplianceNotes] = useState(record?.compliance_notes ?? "");
  const [issueValidFrom, setIssueValidFrom] = useState("");
  const [issueExpiryDate, setIssueExpiryDate] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [regulatoryFrameworkValues, setRegulatoryFrameworkValues] = useState<LookupValue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setChecklist(initialChecklist(record));
    setRegulatoryFramework(record?.regulatory_framework ?? "");
    setComplianceNotes(record?.compliance_notes ?? "");
  }, [record]);

  useEffect(() => {
    let isMounted = true;

    async function loadRegulatoryFrameworks() {
      try {
        const values = await getLookupValuesByCategory("REGULATORY_FRAMEWORK");
        if (isMounted) {
          setRegulatoryFrameworkValues(values);
        }
      } catch {
        if (isMounted) {
          setRegulatoryFrameworkValues([]);
        }
      }
    }

    void loadRegulatoryFrameworks();

    return () => {
      isMounted = false;
    };
  }, []);

  const missingChecklistLabels = useMemo(() => {
    const missing: string[] = [];
    if (!checklist.claims_verified) {
      missing.push("Claims verified");
    }
    if (!checklist.fair_balance_present) {
      missing.push("Fair balance present");
    }
    if (!checklist.pi_references_accurate) {
      missing.push("PI references accurate");
    }
    if (!checklist.safety_information_included) {
      missing.push("Safety information included");
    }
    if (!checklist.country_specific_reqs_met) {
      missing.push("Country-specific requirements met");
    }
    if (!checklist.references_verified) {
      missing.push("References verified");
    }
    if (!checklist.mandatory_annotations_resolved) {
      missing.push("Mandatory annotations resolved");
    }
    if (checklist.off_label_risk_flag) {
      missing.push("Off-label risk must be false");
    }
    return missing;
  }, [checklist]);
  const regulatoryFrameworkOptions = useMemo(() => {
    const options = regulatoryFrameworkValues.map((value) => ({
      value: value.code,
      label: value.label || value.code,
    }));
    const currentFramework = regulatoryFramework.trim().toUpperCase();
    if (currentFramework && !options.some((option) => option.value === currentFramework)) {
      return [...options, { value: currentFramework, label: currentFramework }];
    }
    return options;
  }, [regulatoryFramework, regulatoryFrameworkValues]);

  async function handleCreateRecord() {
    if (!onCreate) {
      return;
    }
    const resolvedContentVersionId = contentVersionId ?? defaultCreatePayload.content_version_id ?? null;
    if (!resolvedContentVersionId) {
      setLocalError("No content version is available for this compliance record.");
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onCreate({
        ...defaultCreatePayload,
        content_version_id: resolvedContentVersionId,
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not create compliance record.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || !onSave) {
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onSave(record.id, {
        regulatory_framework: regulatoryFramework.trim().toUpperCase() || null,
        claims_verified: checklist.claims_verified,
        fair_balance_present: checklist.fair_balance_present,
        pi_references_accurate: checklist.pi_references_accurate,
        safety_information_included: checklist.safety_information_included,
        black_box_warning_included: checklist.black_box_warning_included,
        off_label_risk_flag: checklist.off_label_risk_flag,
        country_specific_reqs_met: checklist.country_specific_reqs_met,
        references_verified: checklist.references_verified,
        mandatory_annotations_resolved: checklist.mandatory_annotations_resolved,
        compliance_notes: complianceNotes.trim() || null,
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not save compliance checklist.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleIssueCode() {
    if (!record || !onIssueCode) {
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onIssueCode(record.id, {
        valid_from: issueValidFrom || null,
        expiry_date: issueExpiryDate || null,
        compliance_notes: issueNotes.trim() || null,
      });
      setIssueNotes("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Could not issue MLR code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SummaryCard title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {(errorMessage || localError) && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage || localError}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-md border border-slate-200 bg-slate-50" />
            ))}
          </div>
        ) : !record ? (
          <div className="space-y-3">
            <EmptyState title="No compliance record yet" description="Create a compliance record for this content version before issuing an MLR code." />
            {canCreate && onCreate && (
              <button type="button" onClick={handleCreateRecord} disabled={isSubmitting} className={primaryButtonClass}>
                {isSubmitting ? "Creating..." : "Create Compliance Record"}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile label="Record Status" value={<span className={getStatusBadgeClass(record.record_status)}>{legalComplianceStatusLabels[record.record_status]}</span>} />
              <InfoTile label="MLR Decision" value={legalComplianceDecisionLabels[record.mlr_decision]} />
              <InfoTile label="MLR Code" value={record.mlr_code || "Not issued"} />
              <InfoTile label="Decision Date" value={formatDate(record.mlr_decision_date)} />
              <InfoTile label="Valid From" value={formatDate(record.valid_from)} />
              <InfoTile label="Expiry Date" value={formatDate(record.expiry_date)} />
              <InfoTile label="Content Version" value={record.content_version_label || "Not set"} />
              <InfoTile label="Asset" value={record.asset_filename || "Not set"} />
            </div>

            {checklist.off_label_risk_flag && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Off-label risk is flagged. MLR code issuance is blocked until this is cleared.
              </div>
            )}
            {!checklist.mandatory_annotations_resolved && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Mandatory review annotations are still open or reopened.
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Regulatory Framework</span>
                <select
                  value={regulatoryFramework}
                  onChange={(event) => setRegulatoryFramework(event.target.value)}
                  disabled={!canEditChecklist || regulatoryFrameworkOptions.length === 0}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">No framework</option>
                  {regulatoryFrameworkOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <ChecklistItem
                  label="Claims Verified"
                  checked={checklist.claims_verified}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, claims_verified: checked }))}
                />
                <ChecklistItem
                  label="Fair Balance Present"
                  checked={checklist.fair_balance_present}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, fair_balance_present: checked }))}
                />
                <ChecklistItem
                  label="PI References Accurate"
                  checked={checklist.pi_references_accurate}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, pi_references_accurate: checked }))}
                />
                <ChecklistItem
                  label="Safety Information Included"
                  checked={checklist.safety_information_included}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, safety_information_included: checked }))}
                />
                <ChecklistItem
                  label="Black Box Warning Included"
                  checked={checklist.black_box_warning_included}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, black_box_warning_included: checked }))}
                />
                <ChecklistItem
                  label="Off-label Risk Flag"
                  checked={checklist.off_label_risk_flag}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, off_label_risk_flag: checked }))}
                />
                <ChecklistItem
                  label="Country-specific Requirements Met"
                  checked={checklist.country_specific_reqs_met}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, country_specific_reqs_met: checked }))}
                />
                <ChecklistItem
                  label="References Verified"
                  checked={checklist.references_verified}
                  disabled={!canEditChecklist}
                  onChange={(checked) => setChecklist((current) => ({ ...current, references_verified: checked }))}
                />
                <ChecklistItem
                  label="Mandatory Annotations Resolved"
                  checked={checklist.mandatory_annotations_resolved}
                  disabled
                  helperText="Derived from mandatory review annotations."
                  onChange={() => {}}
                />
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Compliance Notes</span>
                <textarea
                  value={complianceNotes}
                  onChange={(event) => setComplianceNotes(event.target.value)}
                  rows={4}
                  maxLength={5000}
                  disabled={!canEditChecklist}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              {canEditChecklist && onSave && (
                <div className="flex justify-end">
                  <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                    {isSubmitting ? "Saving..." : "Save Checklist"}
                  </button>
                </div>
              )}
            </form>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Issue MLR Code
              </p>
              {missingChecklistLabels.length > 0 && (
                <p className="mt-2 text-sm text-amber-800">
                  Complete checklist before issuing code: {missingChecklistLabels.join(", ")}.
                </p>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Valid From</span>
                  <input
                    type="date"
                    value={issueValidFrom}
                    onChange={(event) => setIssueValidFrom(event.target.value)}
                    disabled={!canIssueCode}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Expiry Date</span>
                  <input
                    type="date"
                    value={issueExpiryDate}
                    onChange={(event) => setIssueExpiryDate(event.target.value)}
                    disabled={!canIssueCode}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>
              <label className="mt-3 grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Issue Notes</span>
                <textarea
                  value={issueNotes}
                  onChange={(event) => setIssueNotes(event.target.value)}
                  rows={3}
                  maxLength={5000}
                  disabled={!canIssueCode}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>

              {canIssueCode && onIssueCode && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleIssueCode()}
                    disabled={isSubmitting || missingChecklistLabels.length > 0}
                    className={primaryButtonClass}
                  >
                    {record.mlr_code ? "Recheck MLR Code" : "Issue MLR Code"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SummaryCard>
  );
}


type InfoTileProps = {
  label: string;
  value: ReactNode;
};


function InfoTile({ label, value }: InfoTileProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}


type ChecklistItemProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  helperText?: string;
  onChange: (checked: boolean) => void;
};


function ChecklistItem({
  label,
  checked,
  disabled = false,
  helperText,
  onChange,
}: ChecklistItemProps) {
  return (
    <label className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 font-medium text-slate-800">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-100 disabled:cursor-not-allowed"
        />
        {label}
      </span>
      {helperText && <span className="mt-1 block text-xs text-slate-500">{helperText}</span>}
    </label>
  );
}

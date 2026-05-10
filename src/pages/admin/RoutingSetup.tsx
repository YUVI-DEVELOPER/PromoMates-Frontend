import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import {
  designerAssignmentsApi,
  getRoutingPreview,
  medicalReviewerAssignmentsApi,
  mlrReviewerAssignmentsApi,
  regionalMarketingAssignmentsApi,
  therapyLeadAssignmentsApi,
} from "../../api/routing";
import {
  getCountries,
  getDocumentTypes,
  getRegions,
  getSubTherapyAreas,
  getTherapeuticAreas,
  updateCountry,
} from "../../api/masterData";
import { getUsers } from "../../api/users";
import { getUserGroupOptions } from "../../api/userGroups";
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { KpiCard } from "../../components/ui/KpiCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { FormDraftNotice } from "../../components/ui/FormDraftNotice";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { SummaryCard } from "../../components/ui/SummaryCard";
import type { Country, DocumentType, Region, SubTherapyArea, TherapeuticArea } from "../../types/masterData";
import type { AnyRoutingAssignment, RoutingPreview } from "../../types/routing";
import type { User } from "../../types/user";
import type { UserGroupOption } from "../../types/userGroup";
import { getApiErrorMessage } from "../../utils/apiError";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";


type TabKey =
  | "country-region"
  | "regional-marketing"
  | "therapy-lead"
  | "medical-reviewer"
  | "designer"
  | "mlr-reviewer"
  | "preview";


type FormValues = Record<string, string | boolean>;


type RuleApi = {
  list: (params?: { include_inactive?: boolean }) => Promise<AnyRoutingAssignment[]>;
  create: (payload: Record<string, unknown>) => Promise<AnyRoutingAssignment>;
  update: (id: number, payload: Record<string, unknown>) => Promise<AnyRoutingAssignment>;
  deactivate: (id: number) => Promise<AnyRoutingAssignment>;
};


type FieldOptionSource = "regions" | "countries" | "therapyAreas" | "subTherapyAreas" | "documentTypes" | "users" | "groups";


type RuleField = {
  name: string;
  label: string;
  type: "select" | "text" | "number" | "date" | "checkbox";
  required?: boolean;
  source?: FieldOptionSource;
  options?: { value: string; label: string }[];
};


type RuleDefinition = {
  key: Exclude<TabKey, "country-region" | "preview">;
  title: string;
  subtitle: string;
  api: RuleApi;
  fields: RuleField[];
  targetGroupField?: string;
};


const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";


const tabs: { key: TabKey; label: string }[] = [
  { key: "country-region", label: "Country Region Mapping" },
  { key: "regional-marketing", label: "Regional Marketing" },
  { key: "therapy-lead", label: "Therapy Lead" },
  { key: "medical-reviewer", label: "Medical Reviewer" },
  { key: "designer", label: "Designer" },
  { key: "mlr-reviewer", label: "MLR Reviewers" },
  { key: "preview", label: "Routing Preview" },
];


function toId(value: string | boolean): number | null {
  if (typeof value !== "string" || !value) {
    return null;
  }
  return Number(value);
}


function toNumber(value: string | boolean, fallback = 100): number {
  if (typeof value !== "string" || !value) {
    return fallback;
  }
  return Number(value);
}


function valueFor(item: AnyRoutingAssignment | null, field: RuleField): string | boolean {
  if (field.type === "checkbox") {
    return item ? item.is_active : true;
  }
  const rawValue = item ? (item as unknown as Record<string, unknown>)[field.name] : undefined;
  if (rawValue === null || rawValue === undefined) {
    if (field.name === "assignment_mode") {
      return "QUEUE";
    }
    if (field.name === "priority_order") {
      return "100";
    }
    return "";
  }
  return String(rawValue);
}


function buildPayload(fields: RuleField[], values: FormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.type === "checkbox") {
      payload[field.name] = value === true;
      continue;
    }
    if (field.type === "number") {
      payload[field.name] = toNumber(value);
      continue;
    }
    if (field.type === "date") {
      payload[field.name] = typeof value === "string" && value ? value : null;
      continue;
    }
    if (field.type === "select" && field.name.endsWith("_id")) {
      payload[field.name] = toId(value);
      continue;
    }
    payload[field.name] = typeof value === "string" && value ? value.trim() : null;
  }
  return payload;
}


function byId<T extends { id: number; name: string }>(items: T[], id: number | null | undefined): string {
  if (!id) {
    return "Any";
  }
  return items.find((item) => item.id === id)?.name ?? `ID ${id}`;
}


function userName(users: User[], id: number | null | undefined): string {
  if (!id) {
    return "Any";
  }
  return users.find((user) => user.id === id)?.full_name ?? `User ${id}`;
}


function groupName(groups: UserGroupOption[], id: number | null | undefined): string {
  if (!id) {
    return "Any";
  }
  return groups.find((group) => group.id === id)?.name ?? `Group ${id}`;
}


export function RoutingSetup() {
  const [activeTab, setActiveTab] = useState<TabKey>("country-region");
  const [regions, setRegions] = useState<Region[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [therapyAreas, setTherapyAreas] = useState<TherapeuticArea[]>([]);
  const [subTherapyAreas, setSubTherapyAreas] = useState<SubTherapyArea[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const definitions = useMemo<RuleDefinition[]>(
    () => [
      {
        key: "regional-marketing",
        title: "Regional Marketing Assignments",
        subtitle: "Map each region to the regional marketing team queue.",
        api: regionalMarketingAssignmentsApi as RuleApi,
        targetGroupField: "team_group_id",
        fields: [
          { name: "region_id", label: "Region", type: "select", source: "regions", required: true },
          { name: "team_group_id", label: "Team Group", type: "select", source: "groups", required: true },
          { name: "assignment_mode", label: "Assignment Mode", type: "select", options: modeOptions },
          { name: "backup_group_id", label: "Backup Group", type: "select", source: "groups" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ],
      },
      {
        key: "therapy-lead",
        title: "Therapy Lead Assignments",
        subtitle: "Configure the first therapy routing owner by geography and therapy context.",
        api: therapyLeadAssignmentsApi as RuleApi,
        fields: [
          { name: "region_id", label: "Region", type: "select", source: "regions" },
          { name: "country_id", label: "Country", type: "select", source: "countries" },
          { name: "therapy_area_id", label: "Therapy Area", type: "select", source: "therapyAreas", required: true },
          { name: "sub_therapy_area_id", label: "Sub-Therapy", type: "select", source: "subTherapyAreas" },
          { name: "content_type_id", label: "Content Type", type: "select", source: "documentTypes" },
          { name: "assigned_user_id", label: "Assigned User", type: "select", source: "users", required: true },
          { name: "backup_user_id", label: "Backup User", type: "select", source: "users" },
          { name: "priority_order", label: "Priority", type: "number" },
          { name: "effective_from", label: "Effective From", type: "date" },
          { name: "effective_to", label: "Effective To", type: "date" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ],
      },
      {
        key: "medical-reviewer",
        title: "Medical Reviewer Assignments",
        subtitle: "Route medical review to an individual reviewer or claimable pool.",
        api: medicalReviewerAssignmentsApi as RuleApi,
        targetGroupField: "reviewer_group_id",
        fields: medicalReviewerFields(),
      },
      {
        key: "designer",
        title: "Designer Assignments",
        subtitle: "Route design work to an individual designer or design pool.",
        api: designerAssignmentsApi as RuleApi,
        targetGroupField: "designer_group_id",
        fields: poolFields("designer_group_id", "Designer Group"),
      },
      {
        key: "mlr-reviewer",
        title: "MLR Reviewer Assignments",
        subtitle: "Configure formal medical, legal, and regulatory reviewer routing.",
        api: mlrReviewerAssignmentsApi as RuleApi,
        targetGroupField: "reviewer_group_id",
        fields: [
          { name: "review_role_type", label: "Review Role", type: "select", options: reviewRoleOptions, required: true },
          { name: "region_id", label: "Region", type: "select", source: "regions" },
          { name: "country_id", label: "Country", type: "select", source: "countries" },
          { name: "therapy_area_id", label: "Therapy Area", type: "select", source: "therapyAreas" },
          { name: "sub_therapy_area_id", label: "Sub-Therapy", type: "select", source: "subTherapyAreas" },
          { name: "content_type_id", label: "Content Type", type: "select", source: "documentTypes" },
          { name: "assigned_user_id", label: "Assigned User", type: "select", source: "users" },
          { name: "reviewer_group_id", label: "Reviewer Group", type: "select", source: "groups" },
          { name: "assignment_mode", label: "Assignment Mode", type: "select", options: modeOptions },
          { name: "priority_order", label: "Priority", type: "number" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ],
      },
    ],
    [],
  );

  const [rulesByKey, setRulesByKey] = useState<Record<string, AnyRoutingAssignment[]>>({});

  async function loadAll() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [
        nextRegions,
        nextCountries,
        nextTherapyAreas,
        nextSubTherapyAreas,
        nextDocumentTypes,
        nextUsers,
        nextGroups,
        regionalRules,
        therapyRules,
        medicalRules,
        designerRules,
        mlrRules,
      ] = await Promise.all([
        getRegions({ include_inactive: true }),
        getCountries({ include_inactive: true }),
        getTherapeuticAreas({ include_inactive: true }),
        getSubTherapyAreas({ include_inactive: true }),
        getDocumentTypes({ include_inactive: true }),
        getUsers(),
        getUserGroupOptions(),
        regionalMarketingAssignmentsApi.list({ include_inactive: includeInactive }),
        therapyLeadAssignmentsApi.list({ include_inactive: includeInactive }),
        medicalReviewerAssignmentsApi.list({ include_inactive: includeInactive }),
        designerAssignmentsApi.list({ include_inactive: includeInactive }),
        mlrReviewerAssignmentsApi.list({ include_inactive: includeInactive }),
      ]);
      setRegions(nextRegions);
      setCountries(nextCountries);
      setTherapyAreas(nextTherapyAreas);
      setSubTherapyAreas(nextSubTherapyAreas);
      setDocumentTypes(nextDocumentTypes);
      setUsers(nextUsers);
      setGroups(nextGroups);
      setRulesByKey({
        "regional-marketing": regionalRules,
        "therapy-lead": therapyRules,
        "medical-reviewer": medicalRules,
        designer: designerRules,
        "mlr-reviewer": mlrRules,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [includeInactive]);

  const configuredRules = Object.values(rulesByKey).flat().filter((rule) => rule.is_active).length;
  const mappedCountries = countries.filter((country) => country.is_active && country.region_id).length;

  return (
    <PageContainer width="wide">
      <PageHeroSummary
        eyebrow="Admin Console"
        title="Routing Setup"
        subtitle="Configure the routing foundation by country, region, therapy, sub-therapy, content type, users, and teams."
        status="ACTIVE"
        statusLabel="Foundation"
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
        <KpiCard label="Mapped Countries" value={mappedCountries} helperText="Active countries with region" status="success" />
        <KpiCard label="Active Rules" value={configuredRules} helperText="Across routing stages" status="info" />
        <KpiCard label="Sub-Therapies" value={subTherapyAreas.filter((area) => area.is_active).length} helperText="Available for routing" status="neutral" />
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "rounded-md px-3 py-2 text-sm font-semibold transition",
              activeTab === tab.key
                ? "bg-brand-700 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
        <label className="ml-auto flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
          />
          Inactive
        </label>
      </div>

      {isLoading ? (
        <LoadingState label="Loading routing setup..." rows={5} />
      ) : activeTab === "country-region" ? (
        <CountryRegionMapping
          countries={countries}
          regions={regions}
          onChange={setCountries}
          onSaved={(message) => setSuccessMessage(message)}
          onError={(message) => setErrorMessage(message)}
        />
      ) : activeTab === "preview" ? (
        <RoutingPreviewPanel
          countries={countries}
          therapyAreas={therapyAreas}
          subTherapyAreas={subTherapyAreas}
          documentTypes={documentTypes}
          users={users}
          groups={groups}
        />
      ) : (
        definitions
          .filter((definition) => definition.key === activeTab)
          .map((definition) => (
            <AssignmentSection
              key={definition.key}
              definition={definition}
              rules={rulesByKey[definition.key] ?? []}
              regions={regions}
              countries={countries}
              therapyAreas={therapyAreas}
              subTherapyAreas={subTherapyAreas}
              documentTypes={documentTypes}
              users={users}
              groups={groups}
              onReload={loadAll}
              onError={(message) => setErrorMessage(message)}
              onSuccess={(message) => setSuccessMessage(message)}
            />
          ))
      )}
    </PageContainer>
  );
}


const modeOptions = [
  { value: "QUEUE", label: "QUEUE" },
  { value: "DIRECT", label: "DIRECT" },
];


const reviewRoleOptions = [
  { value: "MEDICAL", label: "MEDICAL" },
  { value: "LEGAL", label: "LEGAL" },
  { value: "REGULATORY", label: "REGULATORY" },
];


function poolFields(groupField: string, groupLabel: string): RuleField[] {
  return [
    { name: "region_id", label: "Region", type: "select", source: "regions" },
    { name: "country_id", label: "Country", type: "select", source: "countries" },
    { name: "therapy_area_id", label: "Therapy Area", type: "select", source: "therapyAreas", required: true },
    { name: "sub_therapy_area_id", label: "Sub-Therapy", type: "select", source: "subTherapyAreas" },
    { name: "assigned_user_id", label: "Assigned User", type: "select", source: "users" },
    { name: groupField, label: groupLabel, type: "select", source: "groups" },
    { name: "assignment_mode", label: "Assignment Mode", type: "select", options: modeOptions },
    { name: "backup_user_id", label: "Backup User", type: "select", source: "users" },
    { name: "priority_order", label: "Priority", type: "number" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ];
}


function medicalReviewerFields(): RuleField[] {
  return [
    { name: "region_id", label: "Region", type: "select", source: "regions" },
    { name: "country_id", label: "Country", type: "select", source: "countries" },
    { name: "therapy_area_id", label: "Therapy Area", type: "select", source: "therapyAreas", required: true },
    { name: "sub_therapy_area_id", label: "Sub-Therapy", type: "select", source: "subTherapyAreas" },
    { name: "content_type_id", label: "Content Type", type: "select", source: "documentTypes" },
    { name: "assigned_user_id", label: "Assigned User", type: "select", source: "users" },
    { name: "reviewer_group_id", label: "Reviewer Group", type: "select", source: "groups" },
    { name: "assignment_mode", label: "Assignment Mode", type: "select", options: modeOptions },
    { name: "backup_user_id", label: "Backup User", type: "select", source: "users" },
    { name: "priority_order", label: "Priority", type: "number" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ];
}


type ReferenceProps = {
  regions: Region[];
  countries: Country[];
  therapyAreas: TherapeuticArea[];
  subTherapyAreas: SubTherapyArea[];
  documentTypes: DocumentType[];
  users: User[];
  groups: UserGroupOption[];
};


function optionsFor(field: RuleField, refs: ReferenceProps): { value: string; label: string }[] {
  if (field.options) {
    return field.options;
  }
  const source = field.source;
  if (!source) {
    return [];
  }
  const sourceItems = {
    regions: refs.regions,
    countries: refs.countries,
    therapyAreas: refs.therapyAreas,
    subTherapyAreas: refs.subTherapyAreas,
    documentTypes: refs.documentTypes,
    users: refs.users.map((user) => ({ id: user.id, name: user.full_name })),
    groups: refs.groups,
  }[source];
  return sourceItems.map((item) => ({ value: String(item.id), label: item.name }));
}


function AssignmentSection({
  definition,
  rules,
  regions,
  countries,
  therapyAreas,
  subTherapyAreas,
  documentTypes,
  users,
  groups,
  onReload,
  onError,
  onSuccess,
}: {
  definition: RuleDefinition;
  rules: AnyRoutingAssignment[];
  onReload: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
} & ReferenceProps) {
  const refs = { regions, countries, therapyAreas, subTherapyAreas, documentTypes, users, groups };
  const [editingRule, setEditingRule] = useState<AnyRoutingAssignment | null>(null);
  const draftKey = editingRule
    ? `routing:${definition.key}:edit:${editingRule.id}`
    : `routing:${definition.key}:create`;
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useRedisFormDraft<FormValues>(draftKey);
  const [values, setValues] = useState<FormValues>(() => initialRuleValues(definition.fields, null));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const nextInitialValues = initialRuleValues(definition.fields, editingRule);

    setValues(nextInitialValues);
    void loadDraft().then((draft) => {
      if (isMounted && draft) {
        setValues({ ...nextInitialValues, ...draft.payload });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [definition.fields, editingRule, loadDraft]);

  const columns = useMemo<DataTableColumn<AnyRoutingAssignment>[]>(
    () => [
      {
        header: "Scope",
        className: "min-w-72",
        render: (rule) => (
          <div className="space-y-1 text-sm text-slate-700">
            {"review_role_type" in rule && <Line label="Role" value={rule.review_role_type} />}
            {"region_id" in rule && <Line label="Region" value={byId(regions, rule.region_id)} />}
            {"country_id" in rule && <Line label="Country" value={byId(countries, rule.country_id)} />}
            {"therapy_area_id" in rule && <Line label="Therapy" value={byId(therapyAreas, rule.therapy_area_id)} />}
            {"sub_therapy_area_id" in rule && <Line label="Sub-Therapy" value={byId(subTherapyAreas, rule.sub_therapy_area_id)} />}
            {"content_type_id" in rule && <Line label="Content" value={byId(documentTypes, rule.content_type_id)} />}
          </div>
        ),
      },
      {
        header: "Target",
        className: "min-w-64",
        render: (rule) => (
          <div className="space-y-1 text-sm text-slate-700">
            {"assigned_user_id" in rule && <Line label="User" value={userName(users, rule.assigned_user_id)} />}
            {definition.targetGroupField && (
              <Line
                label="Group"
                value={groupName(
                  groups,
                  (rule as unknown as Record<string, number | null>)[definition.targetGroupField],
                )}
              />
            )}
            {"assignment_mode" in rule && <Line label="Mode" value={String(rule.assignment_mode)} />}
          </div>
        ),
      },
      {
        header: "Priority",
        render: (rule) => ("priority_order" in rule ? rule.priority_order : <span className="text-slate-500">Default</span>),
      },
      {
        header: "Status",
        render: (rule) => <StatusBadge status={rule.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
    ],
    [countries, definition.targetGroupField, documentTypes, groups, regions, subTherapyAreas, therapyAreas, users],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    onError("");
    try {
      const payload = buildPayload(definition.fields, values);
      if (editingRule) {
        await definition.api.update(editingRule.id, payload);
        onSuccess("Assignment rule updated.");
      } else {
        await definition.api.create(payload);
        onSuccess("Assignment rule created.");
      }
      await clearDraft();
      setEditingRule(null);
      setValues(initialRuleValues(definition.fields, null));
      await onReload();
    } catch (error) {
      onError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    await saveDraft(values);
  }

  async function handleDeactivate(rule: AnyRoutingAssignment) {
    if (!window.confirm("Deactivate this assignment rule?")) {
      return;
    }
    try {
      await definition.api.deactivate(rule.id);
      onSuccess("Assignment rule deactivated.");
      await onReload();
    } catch (error) {
      onError(getApiErrorMessage(error));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.65fr)_minmax(0,1.35fr)]">
      <SummaryCard title={definition.title} subtitle={definition.subtitle}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormDraftNotice
            state={draftState}
            updatedAt={draftUpdatedAt}
            expiresAt={draftExpiresAt}
            error={draftError}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {definition.fields.map((field) => (
              <RuleInput
                key={field.name}
                field={field}
                value={values[field.name] ?? (field.type === "checkbox" ? true : "")}
                options={optionsFor(field, refs)}
                onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
              />
            ))}
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            {editingRule && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setEditingRule(null)}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => void handleSaveDraft()}
              disabled={isSubmitting || draftState === "saving"}
            >
              {draftState === "saving" ? "Saving draft..." : "Save Draft"}
            </button>
            <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting ? "Saving..." : editingRule ? "Save Rule" : "Create Rule"}
            </button>
          </div>
        </form>
      </SummaryCard>

      <SummaryCard title="Configured Rules" subtitle="Rules are evaluated by specificity and priority.">
        <DataTable
          rows={rules}
          columns={columns}
          getRowKey={(rule) => `${definition.key}-${rule.id}`}
          isLoading={false}
          loadingLabel="Loading assignment rules..."
          emptyTitle="No assignment rules"
          emptyDescription="Create the first rule for this routing stage."
          renderActions={(rule) => (
            <>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => setEditingRule(rule)}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={!rule.is_active}
                className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleDeactivate(rule)}
              >
                Deactivate
              </button>
            </>
          )}
        />
      </SummaryCard>
    </div>
  );
}


function initialRuleValues(fields: RuleField[], rule: AnyRoutingAssignment | null): FormValues {
  return Object.fromEntries(fields.map((field) => [field.name, valueFor(rule, field)]));
}


function RuleInput({
  field,
  value,
  options,
  onChange,
}: {
  field: RuleField;
  value: string | boolean;
  options: { value: string; label: string }[];
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
        />
        {field.label}
      </label>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-rose-600"> *</span>}
      </label>
      {field.type === "select" ? (
        <select
          id={field.name}
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Any</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          required={field.required}
          type={field.type}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      )}
    </div>
  );
}


function CountryRegionMapping({
  countries,
  regions,
  onChange,
  onSaved,
  onError,
}: {
  countries: Country[];
  regions: Region[];
  onChange: (countries: Country[]) => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  async function handleSave(country: Country) {
    try {
      const updated = await updateCountry(country.id, {
        code: country.code,
        name: country.name,
        region_id: country.region_id ?? null,
        is_active: country.is_active,
      });
      onChange(countries.map((item) => (item.id === updated.id ? updated : item)));
      onSaved(`Saved region mapping for ${updated.name}.`);
    } catch (error) {
      onError(getApiErrorMessage(error));
    }
  }

  const columns = useMemo<DataTableColumn<Country>[]>(
    () => [
      {
        header: "Country",
        render: (country) => (
          <div>
            <p className="font-semibold text-slate-950">{country.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{country.code}</p>
          </div>
        ),
      },
      {
        header: "Region",
        className: "min-w-64",
        render: (country) => (
          <select
            value={country.region_id ?? ""}
            onChange={(event) => {
              const regionId = event.target.value ? Number(event.target.value) : null;
              onChange(countries.map((item) => (item.id === country.id ? { ...item, region_id: regionId } : item)));
            }}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Select region</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>{region.name}</option>
            ))}
          </select>
        ),
      },
      {
        header: "Status",
        render: (country) => <StatusBadge status={country.is_active ? "ACTIVE" : "INACTIVE"} />,
      },
    ],
    [countries, onChange, regions],
  );

  return (
    <SummaryCard title="Country Region Mapping" subtitle="Every active country should map to one active region.">
      <DataTable
        rows={countries}
        columns={columns}
        getRowKey={(country) => country.id}
        isLoading={false}
        loadingLabel="Loading country mappings..."
        emptyTitle="No countries"
        emptyDescription="Create countries from Master Data first."
        renderActions={(country) => (
          <button type="button" onClick={() => void handleSave(country)} className={secondaryButtonClass}>
            Save
          </button>
        )}
      />
    </SummaryCard>
  );
}


function RoutingPreviewPanel({
  countries,
  therapyAreas,
  subTherapyAreas,
  documentTypes,
  users,
  groups,
}: Pick<ReferenceProps, "countries" | "therapyAreas" | "subTherapyAreas" | "documentTypes" | "users" | "groups">) {
  const [countryId, setCountryId] = useState("");
  const [therapyAreaId, setTherapyAreaId] = useState("");
  const [subTherapyAreaId, setSubTherapyAreaId] = useState("");
  const [contentTypeId, setContentTypeId] = useState("");
  const [preview, setPreview] = useState<RoutingPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!countryId || !therapyAreaId) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await getRoutingPreview({
        country_id: Number(countryId),
        therapy_area_id: Number(therapyAreaId),
        sub_therapy_area_id: subTherapyAreaId ? Number(subTherapyAreaId) : undefined,
        content_type_id: contentTypeId ? Number(contentTypeId) : undefined,
      });
      setPreview(result);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.6fr)_minmax(0,1.4fr)]">
      <SummaryCard title="Routing Preview" subtitle="Test assignment resolution without starting a workflow instance.">
        {errorMessage && <ErrorState message={errorMessage} />}
        <form className="space-y-4" onSubmit={handlePreview}>
          <PreviewSelect label="Country" value={countryId} options={countries} required onChange={setCountryId} />
          <PreviewSelect label="Therapy Area" value={therapyAreaId} options={therapyAreas} required onChange={setTherapyAreaId} />
          <PreviewSelect label="Sub-Therapy" value={subTherapyAreaId} options={subTherapyAreas} onChange={setSubTherapyAreaId} />
          <PreviewSelect label="Content Type" value={contentTypeId} options={documentTypes} onChange={setContentTypeId} />
          <button type="submit" disabled={isLoading} className={primaryButtonClass}>
            {isLoading ? "Resolving..." : "Run Preview"}
          </button>
        </form>
      </SummaryCard>

      <SummaryCard title="Preview Result" subtitle="Resolved region, teams, users, pools, and reviewer roles.">
        {!preview ? (
          <p className="text-sm text-slate-500">Select routing inputs and run preview.</p>
        ) : (
          <div className="space-y-4">
            <ResultBlock
              title="Derived Region"
              value={preview.derived_region.name || "Not resolved"}
              detail={preview.derived_region.reason}
              warnings={preview.derived_region.warnings}
            />
            <ResolutionBlock title="Regional Marketing Team" resolution={preview.regional_marketing_team} users={users} groups={groups} />
            <ResolutionBlock title="Therapy Lead" resolution={preview.therapy_lead} users={users} groups={groups} />
            <ResolutionBlock title="Medical Reviewer / Pool" resolution={preview.medical_reviewer} users={users} groups={groups} />
            <ResolutionBlock title="Designer / Pool" resolution={preview.designer} users={users} groups={groups} />
            {preview.mlr_reviewers.map((resolution) => (
              <ResolutionBlock
                key={resolution.review_role_type}
                title={`MLR ${resolution.review_role_type}`}
                resolution={resolution}
                users={users}
                groups={groups}
              />
            ))}
          </div>
        )}
      </SummaryCard>
    </div>
  );
}


function PreviewSelect<T extends { id: number; name: string }>({
  label,
  value,
  options,
  required = false,
  onChange,
}: {
  label: string;
  value: string;
  options: T[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </div>
  );
}


function ResolutionBlock({
  title,
  resolution,
  users,
  groups,
}: {
  title: string;
  resolution: RoutingPreview["therapy_lead"];
  users: User[];
  groups: UserGroupOption[];
}) {
  const target =
    resolution.assigned_user_id
      ? userName(users, resolution.assigned_user_id)
      : resolution.assigned_group_id
        ? groupName(groups, resolution.assigned_group_id)
        : "Not assigned";
  return (
    <ResultBlock
      title={title}
      value={target}
      detail={resolution.reason}
      warnings={resolution.warnings}
      status={resolution.assignment_found ? "ACTIVE" : "PENDING"}
    />
  );
}


function ResultBlock({
  title,
  value,
  detail,
  warnings,
  status = "ACTIVE",
}: {
  title: string;
  value: ReactNode;
  detail: string;
  warnings: string[];
  status?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-700">{value}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
      {warnings.length > 0 && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.join(" ")}
        </div>
      )}
    </div>
  );
}


function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-slate-500">{label}:</span>{" "}
      <span className="text-slate-800">{value}</span>
    </p>
  );
}

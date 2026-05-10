import {
  createRegion,
  deleteRegion,
  getExternalRegionSuggestions,
  getExternalRegulatoryBodySuggestions,
  getExternalTimezoneSuggestions,
  getRegions,
  updateRegion,
} from "../../../api/masterData";
import {
  FlexibleMasterDataCrudPage,
  type FlexibleField,
  type FlexibleFormValues,
} from "../../../components/master-data/FlexibleMasterDataCrudPage";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import type { MasterDataTableColumn } from "../../../components/master-data/MasterDataTable";
import type {
  ExternalRegionSuggestion,
  ExternalRegulatoryBodySuggestion,
  ExternalTimezoneSuggestion,
  Region,
  RegionPayload,
} from "../../../types/masterData";


function optionData<T>(option: { data?: unknown }): T | null {
  return (option.data ?? null) as T | null;
}


const regionFields: FlexibleField[] = [
  {
    name: "name",
    label: "Name",
    type: "autocomplete",
    required: true,
    placeholder: "Start typing a region, e.g. Africa",
    loadOptions: async (query) => {
      const suggestions = await getExternalRegionSuggestions(query);
      return suggestions.map((suggestion) => ({
        value: suggestion.name,
        label: suggestion.name,
        description: `${suggestion.code} / ${suggestion.country_count} countries / ${suggestion.source}`,
        data: suggestion,
      }));
    },
    onOptionSelect: async (option, values) => {
      const suggestion = optionData<ExternalRegionSuggestion>(option);
      const regulatoryBodies = suggestion
        ? await getExternalRegulatoryBodySuggestions(suggestion.name).catch(() => [])
        : [];
      return {
        ...values,
        name: suggestion?.name ?? option.value,
        code: suggestion?.code ?? String(values.code ?? ""),
        timezone: suggestion?.timezone ?? String(values.timezone ?? ""),
        regulatory_body:
          regulatoryBodies[0]?.name ??
          String(values.regulatory_body ?? ""),
      };
    },
  },
  { name: "code", label: "Code", type: "text", required: true, transform: "uppercase" },
  {
    name: "regulatory_body",
    label: "Regulatory Body",
    type: "autocomplete",
    placeholder: "Search regulatory body",
    loadOptions: async (query, values) => {
      const scope = query || String(values.name ?? "");
      const suggestions = await getExternalRegulatoryBodySuggestions(scope);
      return suggestions.map((suggestion: ExternalRegulatoryBodySuggestion) => ({
        value: suggestion.name,
        label: suggestion.name,
        description: suggestion.snippet || suggestion.source,
        data: suggestion,
      }));
    },
  },
  {
    name: "timezone",
    label: "Timezone",
    type: "autocomplete",
    placeholder: "Asia/Singapore",
    loadOptions: async (query) => {
      const suggestions = await getExternalTimezoneSuggestions(query);
      return suggestions.map((suggestion: ExternalTimezoneSuggestion) => ({
        value: suggestion.timezone,
        label: suggestion.timezone,
        description: suggestion.country_codes.length
          ? `Countries: ${suggestion.country_codes.slice(0, 8).join(", ")}`
          : suggestion.source,
        data: suggestion,
      }));
    },
  },
  { name: "description", label: "Description", type: "textarea", fullWidth: true },
  { name: "is_active", label: "Active", type: "checkbox" },
];


const regionColumns: MasterDataTableColumn<Region>[] = [
  {
    header: "Region",
    render: (region) => (
      <div>
        <p className="font-medium text-slate-950">{region.name}</p>
        <p className="mt-1 text-xs text-slate-500">ID {region.id}</p>
      </div>
    ),
  },
  {
    header: "Code",
    render: (region) => (
      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
        {region.code}
      </span>
    ),
  },
  {
    header: "Regulatory Body",
    render: (region) => region.regulatory_body || <span className="text-slate-500">Not set</span>,
  },
  {
    header: "Timezone",
    render: (region) => region.timezone || <span className="text-slate-500">Not set</span>,
  },
  {
    header: "Status",
    render: (region) => <StatusBadge isActive={region.is_active} />,
  },
];


function getInitialValues(region: Region | null): FlexibleFormValues {
  return {
    code: region?.code ?? "",
    name: region?.name ?? "",
    regulatory_body: region?.regulatory_body ?? "",
    timezone: region?.timezone ?? "",
    description: region?.description ?? "",
    is_active: region?.is_active ?? true,
  };
}


function buildPayload(values: FlexibleFormValues): RegionPayload {
  return {
    code: String(values.code).trim(),
    name: String(values.name).trim(),
    regulatory_body: String(values.regulatory_body).trim() || null,
    timezone: String(values.timezone).trim() || null,
    description: String(values.description).trim() || null,
    is_active: values.is_active === true,
  };
}


export function RegionsPage() {
  return (
    <FlexibleMasterDataCrudPage<Region, RegionPayload>
      title="Regions"
      entityLabel="Region"
      description="Manage regional operating groups used for future request routing and localization."
      fields={regionFields}
      columns={regionColumns}
      loadItems={getRegions}
      createItem={createRegion}
      updateItem={updateRegion}
      deleteItem={deleteRegion}
      getInitialValues={getInitialValues}
      buildPayload={buildPayload}
      getSearchValues={(region) => [
        region.name,
        region.code,
        region.description ?? "",
        region.regulatory_body ?? "",
        region.timezone ?? "",
      ]}
    />
  );
}

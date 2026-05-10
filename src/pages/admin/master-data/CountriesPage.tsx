import {
  createCountry,
  deleteCountry,
  getExternalCountrySuggestions,
  getCountries,
  getRegions,
  updateCountry,
} from "../../../api/masterData";
import {
  FlexibleMasterDataCrudPage,
  type FlexibleField,
  type FlexibleFormValues,
} from "../../../components/master-data/FlexibleMasterDataCrudPage";
import type { MasterDataTableColumn } from "../../../components/master-data/MasterDataTable";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import type { Country, CountryPayload, ExternalCountrySuggestion, Region } from "../../../types/masterData";
import { useEffect, useMemo, useState } from "react";

const continentRegionNames = new Set(["africa", "americas", "asia", "europe", "oceania", "antarctic", "antarctica"]);


function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}


function countryMatchesSelectedRegion(suggestion: ExternalCountrySuggestion, selectedRegion: Region): boolean {
  const regionName = normalizeName(selectedRegion.name);
  const regionCode = normalizeName(selectedRegion.code);
  const suggestionRegion = normalizeName(suggestion.region);
  const suggestionSubregion = normalizeName(suggestion.subregion);
  if (continentRegionNames.has(regionName)) {
    return suggestionRegion === regionName || suggestionSubregion === regionName;
  }

  const candidates = [
    suggestion.world_bank_region,
    suggestion.subregion,
    suggestion.region,
  ].map(normalizeName).filter(Boolean);

  return candidates.some(
    (candidate) =>
      candidate === regionName ||
      candidate.includes(regionName) ||
      regionName.includes(candidate) ||
      candidate === regionCode,
  );
}


function buildCountryColumns(regions: Region[]): MasterDataTableColumn<Country>[] {
  const regionById = new Map(regions.map((region) => [region.id, region.name]));
  return [
    {
      header: "Country",
      render: (country) => (
        <div>
          <p className="font-medium text-slate-950">{country.name}</p>
          <p className="mt-1 text-xs text-slate-500">ID {country.id}</p>
        </div>
      ),
    },
    {
      header: "Code",
      render: (country) => (
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {country.code}
        </span>
      ),
    },
    {
      header: "Region",
      render: (country) =>
        country.region_name || (country.region_id ? regionById.get(country.region_id) : null) || (
          <span className="text-rose-700">Not mapped</span>
        ),
    },
    {
      header: "Status",
      render: (country) => <StatusBadge isActive={country.is_active} />,
    },
  ];
}


function getInitialValues(country: Country | null): FlexibleFormValues {
  return {
    code: country?.code ?? "",
    name: country?.name ?? "",
    region_id: country?.region_id ? String(country.region_id) : "",
    is_active: country?.is_active ?? true,
  };
}


function buildPayload(values: FlexibleFormValues): CountryPayload {
  return {
    code: String(values.code).trim(),
    name: String(values.name).trim(),
    region_id: values.region_id ? Number(values.region_id) : null,
    is_active: values.is_active === true,
  };
}


export function CountriesPage() {
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    void getRegions().then(setRegions).catch(() => setRegions([]));
  }, []);

  const countryFields = useMemo<FlexibleField[]>(
    () => [
      {
        name: "region_id",
        label: "Region",
        type: "select",
        required: true,
        placeholder: "Select region",
        options: regions.map((region) => ({ value: String(region.id), label: region.name })),
      },
      {
        name: "name",
        label: "Name",
        type: "autocomplete",
        required: true,
        placeholder: "Select country",
        disabledWhen: (values) => !values.region_id,
        minSearchLength: 0,
        loadOptions: async (query, values) => {
          const selectedRegion = regions.find((region) => String(region.id) === String(values.region_id));
          if (!selectedRegion) {
            return [];
          }
          const suggestions = await getExternalCountrySuggestions(query, selectedRegion.name);
          return suggestions.filter((suggestion) => countryMatchesSelectedRegion(suggestion, selectedRegion)).map((suggestion) => ({
            value: suggestion.name,
            label: `${suggestion.name} (${suggestion.code})`,
            description: [
              suggestion.world_bank_region ?? suggestion.region,
              suggestion.timezone,
            ].filter(Boolean).join(" / "),
            data: suggestion,
          }));
        },
        onOptionSelect: (option, values) => {
          const suggestion = (option.data ?? null) as ExternalCountrySuggestion | null;
          return {
            ...values,
            name: suggestion?.name ?? option.value,
            code: suggestion?.code ?? String(values.code ?? ""),
            region_id: String(values.region_id ?? ""),
          };
        },
      },
      { name: "code", label: "Code", type: "text", required: true, transform: "uppercase" },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
    [regions],
  );

  return (
    <FlexibleMasterDataCrudPage<Country, CountryPayload>
      title="Countries"
      entityLabel="Country"
      description="Manage markets where materials can be submitted, reviewed, or used."
      fields={countryFields}
      columns={buildCountryColumns(regions)}
      loadItems={getCountries}
      createItem={createCountry}
      updateItem={updateCountry}
      deleteItem={deleteCountry}
      getInitialValues={getInitialValues}
      buildPayload={buildPayload}
      getSearchValues={(country) => [
        country.name,
        country.code,
        country.region_name ?? "",
        country.region_id ? String(country.region_id) : "",
      ]}
    />
  );
}

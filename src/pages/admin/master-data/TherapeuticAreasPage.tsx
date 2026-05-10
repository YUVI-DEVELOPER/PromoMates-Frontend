import {
  createTherapeuticArea,
  deleteTherapeuticArea,
  getTherapeuticAreas,
  updateTherapeuticArea,
} from "../../../api/masterData";
import {
  FlexibleMasterDataCrudPage,
  type FlexibleField,
  type FlexibleFormValues,
} from "../../../components/master-data/FlexibleMasterDataCrudPage";
import type { MasterDataTableColumn } from "../../../components/master-data/MasterDataTable";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import type { TherapeuticArea, TherapeuticAreaPayload } from "../../../types/masterData";


const therapeuticAreaFields: FlexibleField[] = [
  { name: "code", label: "Code", type: "text", required: true, transform: "uppercase" },
  { name: "name", label: "Name", type: "text", required: true },
  {
    name: "brand_guidelines_url",
    label: "Brand Guidelines URL",
    type: "text",
    fullWidth: true,
  },
  { name: "description", label: "Description", type: "textarea", fullWidth: true },
  { name: "is_active", label: "Active", type: "checkbox" },
];


const therapeuticAreaColumns: MasterDataTableColumn<TherapeuticArea>[] = [
  {
    header: "Therapeutic Area",
    render: (area) => (
      <div>
        <p className="font-medium text-slate-950">{area.name}</p>
        <p className="mt-1 text-xs text-slate-500">ID {area.id}</p>
      </div>
    ),
  },
  {
    header: "Code",
    render: (area) => (
      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
        {area.code}
      </span>
    ),
  },
  {
    header: "Guidelines",
    className: "min-w-64",
    render: (area) =>
      area.brand_guidelines_url ? (
        <span className="break-words text-slate-600">{area.brand_guidelines_url}</span>
      ) : (
        <span className="text-slate-500">Not set</span>
      ),
  },
  {
    header: "Status",
    render: (area) => <StatusBadge isActive={area.is_active} />,
  },
];


function getInitialValues(area: TherapeuticArea | null): FlexibleFormValues {
  return {
    code: area?.code ?? "",
    name: area?.name ?? "",
    brand_guidelines_url: area?.brand_guidelines_url ?? "",
    description: area?.description ?? "",
    is_active: area?.is_active ?? true,
  };
}


function buildPayload(values: FlexibleFormValues): TherapeuticAreaPayload {
  return {
    code: String(values.code).trim(),
    name: String(values.name).trim(),
    brand_guidelines_url: String(values.brand_guidelines_url).trim() || null,
    description: String(values.description).trim() || null,
    is_active: values.is_active === true,
  };
}


export function TherapeuticAreasPage() {
  return (
    <FlexibleMasterDataCrudPage<TherapeuticArea, TherapeuticAreaPayload>
      title="Therapeutic Areas"
      entityLabel="Therapeutic Area"
      description="Manage therapy-area taxonomy for future planning, routing, and product alignment."
      fields={therapeuticAreaFields}
      columns={therapeuticAreaColumns}
      loadItems={getTherapeuticAreas}
      createItem={createTherapeuticArea}
      updateItem={updateTherapeuticArea}
      deleteItem={deleteTherapeuticArea}
      getInitialValues={getInitialValues}
      buildPayload={buildPayload}
      getSearchValues={(area) => [
        area.name,
        area.code,
        area.description ?? "",
        area.brand_guidelines_url ?? "",
      ]}
    />
  );
}

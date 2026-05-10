import {
  createDesignAgency,
  deleteDesignAgency,
  getDesignAgencies,
  updateDesignAgency,
} from "../../../api/masterData";
import {
  FlexibleMasterDataCrudPage,
  type FlexibleField,
  type FlexibleFormValues,
} from "../../../components/master-data/FlexibleMasterDataCrudPage";
import type { MasterDataTableColumn } from "../../../components/master-data/MasterDataTable";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import type { DesignAgency, DesignAgencyPayload } from "../../../types/masterData";


const designAgencyFields: FlexibleField[] = [
  { name: "name", label: "Name", type: "text", required: true, fullWidth: true },
  { name: "contact_email", label: "Contact Email", type: "text" },
  { name: "contact_person", label: "Contact Person", type: "text" },
  { name: "contract_start_date", label: "Contract Start Date", type: "date" },
  { name: "contract_end_date", label: "Contract End Date", type: "date" },
  { name: "nda_on_file", label: "NDA on file", type: "checkbox" },
  { name: "is_active", label: "Active", type: "checkbox" },
];


const designAgencyColumns: MasterDataTableColumn<DesignAgency>[] = [
  {
    header: "Agency",
    render: (agency) => (
      <div>
        <p className="font-medium text-slate-950">{agency.name}</p>
        <p className="mt-1 text-xs text-slate-500">ID {agency.id}</p>
      </div>
    ),
  },
  {
    header: "Contact",
    className: "min-w-64",
    render: (agency) => (
      <div>
        <p className="text-slate-900">{agency.contact_person || "Not set"}</p>
        <p className="mt-1 text-xs text-slate-500">{agency.contact_email || "No email"}</p>
      </div>
    ),
  },
  {
    header: "Contract",
    render: (agency) =>
      agency.contract_start_date || agency.contract_end_date ? (
        <span className="whitespace-nowrap text-slate-600">
          {agency.contract_start_date || "Open"} - {agency.contract_end_date || "Open"}
        </span>
      ) : (
        <span className="text-slate-500">Not set</span>
      ),
  },
  {
    header: "NDA",
    render: (agency) => (
      <span className="text-slate-700">{agency.nda_on_file ? "On file" : "Not on file"}</span>
    ),
  },
  {
    header: "Status",
    render: (agency) => <StatusBadge isActive={agency.is_active} />,
  },
];


function getInitialValues(agency: DesignAgency | null): FlexibleFormValues {
  return {
    name: agency?.name ?? "",
    contact_email: agency?.contact_email ?? "",
    contact_person: agency?.contact_person ?? "",
    contract_start_date: agency?.contract_start_date ?? "",
    contract_end_date: agency?.contract_end_date ?? "",
    nda_on_file: agency?.nda_on_file ?? false,
    is_active: agency?.is_active ?? true,
  };
}


function buildPayload(values: FlexibleFormValues): DesignAgencyPayload {
  return {
    name: String(values.name).trim(),
    contact_email: String(values.contact_email).trim() || null,
    contact_person: String(values.contact_person).trim() || null,
    contract_start_date: String(values.contract_start_date).trim() || null,
    contract_end_date: String(values.contract_end_date).trim() || null,
    nda_on_file: values.nda_on_file === true,
    is_active: values.is_active === true,
  };
}


export function DesignAgenciesPage() {
  return (
    <FlexibleMasterDataCrudPage<DesignAgency, DesignAgencyPayload>
      title="Design Agencies"
      entityLabel="Design Agency"
      description="Manage internal and external design partners for future creative production tracking."
      fields={designAgencyFields}
      columns={designAgencyColumns}
      loadItems={getDesignAgencies}
      createItem={createDesignAgency}
      updateItem={updateDesignAgency}
      deleteItem={deleteDesignAgency}
      getInitialValues={getInitialValues}
      buildPayload={buildPayload}
      getSearchValues={(agency) => [
        agency.name,
        agency.contact_person ?? "",
        agency.contact_email ?? "",
      ]}
    />
  );
}

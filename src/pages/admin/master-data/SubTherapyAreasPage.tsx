import { useEffect, useMemo, useState } from "react";

import {
  createSubTherapyArea,
  deleteSubTherapyArea,
  getSubTherapyAreas,
  getTherapeuticAreas,
  updateSubTherapyArea,
} from "../../../api/masterData";
import {
  FlexibleMasterDataCrudPage,
  type FlexibleField,
  type FlexibleFormValues,
} from "../../../components/master-data/FlexibleMasterDataCrudPage";
import type { MasterDataTableColumn } from "../../../components/master-data/MasterDataTable";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import type {
  SubTherapyArea,
  SubTherapyAreaPayload,
  TherapeuticArea,
} from "../../../types/masterData";


function getInitialValues(subTherapyArea: SubTherapyArea | null): FlexibleFormValues {
  return {
    code: subTherapyArea?.code ?? "",
    name: subTherapyArea?.name ?? "",
    therapy_area_id: subTherapyArea?.therapy_area_id ? String(subTherapyArea.therapy_area_id) : "",
    description: subTherapyArea?.description ?? "",
    is_active: subTherapyArea?.is_active ?? true,
  };
}


function buildPayload(values: FlexibleFormValues): SubTherapyAreaPayload {
  return {
    code: String(values.code).trim(),
    name: String(values.name).trim(),
    therapy_area_id: Number(values.therapy_area_id),
    description: String(values.description).trim() || null,
    is_active: values.is_active === true,
  };
}


function buildColumns(therapeuticAreas: TherapeuticArea[]): MasterDataTableColumn<SubTherapyArea>[] {
  const therapyById = new Map(therapeuticAreas.map((area) => [area.id, area.name]));
  return [
    {
      header: "Sub-Therapy",
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
      header: "Therapy Area",
      render: (area) =>
        area.therapy_area_name || therapyById.get(area.therapy_area_id) || (
          <span className="text-slate-500">Not loaded</span>
        ),
    },
    {
      header: "Status",
      render: (area) => <StatusBadge isActive={area.is_active} />,
    },
  ];
}


export function SubTherapyAreasPage() {
  const [therapeuticAreas, setTherapeuticAreas] = useState<TherapeuticArea[]>([]);

  useEffect(() => {
    void getTherapeuticAreas().then(setTherapeuticAreas).catch(() => setTherapeuticAreas([]));
  }, []);

  const fields = useMemo<FlexibleField[]>(
    () => [
      { name: "code", label: "Code", type: "text", required: true, transform: "uppercase" },
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "therapy_area_id",
        label: "Therapy Area",
        type: "select",
        required: true,
        placeholder: "Select therapy area",
        options: therapeuticAreas.map((area) => ({ value: String(area.id), label: area.name })),
      },
      { name: "description", label: "Description", type: "textarea", fullWidth: true },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
    [therapeuticAreas],
  );

  return (
    <FlexibleMasterDataCrudPage<SubTherapyArea, SubTherapyAreaPayload>
      title="Sub-Therapy Areas"
      entityLabel="Sub-Therapy Area"
      description="Manage sub-therapy taxonomy used by routing rules."
      fields={fields}
      columns={buildColumns(therapeuticAreas)}
      loadItems={getSubTherapyAreas}
      createItem={createSubTherapyArea}
      updateItem={updateSubTherapyArea}
      deleteItem={deleteSubTherapyArea}
      getInitialValues={getInitialValues}
      buildPayload={buildPayload}
      getSearchValues={(area) => [
        area.name,
        area.code,
        area.description ?? "",
        area.therapy_area_name ?? "",
      ]}
    />
  );
}

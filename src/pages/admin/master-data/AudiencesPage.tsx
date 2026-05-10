import {
  createAudience,
  deleteAudience,
  getAudiences,
  updateAudience,
} from "../../../api/masterData";
import { MasterDataCrudPage } from "../../../components/master-data/MasterDataCrudPage";
import type { Audience } from "../../../types/masterData";


export function AudiencesPage() {
  return (
    <MasterDataCrudPage<Audience>
      title="Audiences"
      entityLabel="Audience"
      description="Manage admin-defined intended audiences."
      supportsDescription
      loadItems={getAudiences}
      createItem={createAudience}
      updateItem={updateAudience}
      deleteItem={deleteAudience}
    />
  );
}

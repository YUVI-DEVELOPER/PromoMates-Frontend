import {
  createDocumentType,
  deleteDocumentType,
  getDocumentTypes,
  updateDocumentType,
} from "../../../api/masterData";
import { MasterDataCrudPage } from "../../../components/master-data/MasterDataCrudPage";
import type { DocumentType } from "../../../types/masterData";


export function DocumentTypesPage() {
  return (
    <MasterDataCrudPage<DocumentType>
      title="Document Types"
      entityLabel="Document Type"
      description="Manage high-level material categories such as promotional, medical, and training material."
      supportsDescription
      loadItems={getDocumentTypes}
      createItem={createDocumentType}
      updateItem={updateDocumentType}
      deleteItem={deleteDocumentType}
    />
  );
}

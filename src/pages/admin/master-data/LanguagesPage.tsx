import {
  createLanguage,
  deleteLanguage,
  getLanguages,
  updateLanguage,
} from "../../../api/masterData";
import { MasterDataCrudPage } from "../../../components/master-data/MasterDataCrudPage";
import type { Language } from "../../../types/masterData";


export function LanguagesPage() {
  return (
    <MasterDataCrudPage<Language>
      title="Languages"
      entityLabel="Language"
      description="Manage languages available for promotional material metadata and content."
      supportsDescription={false}
      codeTransform="none"
      loadItems={getLanguages}
      createItem={createLanguage}
      updateItem={updateLanguage}
      deleteItem={deleteLanguage}
    />
  );
}

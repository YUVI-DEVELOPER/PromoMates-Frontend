import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from "../../../api/masterData";
import { MasterDataCrudPage } from "../../../components/master-data/MasterDataCrudPage";
import type { Brand } from "../../../types/masterData";


export function BrandsPage() {
  return (
    <MasterDataCrudPage<Brand>
      title="Brands"
      entityLabel="Brand"
      description="Manage brand families used when classifying promotional materials."
      supportsDescription
      loadItems={getBrands}
      createItem={createBrand}
      updateItem={updateBrand}
      deleteItem={deleteBrand}
    />
  );
}

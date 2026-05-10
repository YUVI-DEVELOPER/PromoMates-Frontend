import { useCallback, useEffect, useState } from "react";

import { getMaterialRequestMasterDataOptions } from "../api/masterData";
import type {
  Audience,
  Brand,
  Campaign,
  Channel,
  Country,
  DocumentType,
  Product,
  Region,
  SubTherapyArea,
  TherapeuticArea,
} from "../types/masterData";
import { getApiErrorMessage } from "../utils/apiError";


export type MaterialRequestMasterData = {
  regions: Region[];
  countries: Country[];
  brands: Brand[];
  products: Product[];
  therapeuticAreas: TherapeuticArea[];
  subTherapyAreas: SubTherapyArea[];
  campaigns: Campaign[];
  documentTypes: DocumentType[];
  audiences: Audience[];
  channels: Channel[];
};


const emptyMasterData: MaterialRequestMasterData = {
  regions: [],
  countries: [],
  brands: [],
  products: [],
  therapeuticAreas: [],
  subTherapyAreas: [],
  campaigns: [],
  documentTypes: [],
  audiences: [],
  channels: [],
};


export function useMaterialRequestMasterData() {
  const [masterData, setMasterData] = useState<MaterialRequestMasterData>(emptyMasterData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMasterData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const options = await getMaterialRequestMasterDataOptions();
      setMasterData({
        regions: options.regions,
        countries: options.countries,
        brands: options.brands,
        products: options.products,
        therapeuticAreas: options.therapeutic_areas,
        subTherapyAreas: options.sub_therapy_areas,
        campaigns: options.campaigns,
        documentTypes: options.document_types,
        audiences: options.audiences,
        channels: options.channels,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMasterData();
  }, [loadMasterData]);

  return {
    ...masterData,
    isLoading,
    errorMessage,
    reload: loadMasterData,
  };
}

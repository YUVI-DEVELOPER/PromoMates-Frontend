import { useCallback, useEffect, useState } from "react";

import { getDocumentMasterDataOptions } from "../api/masterData";
import type {
  Audience,
  Brand,
  Channel,
  Country,
  DocumentSubtype,
  DocumentType,
  Language,
  Product,
} from "../types/masterData";
import { getApiErrorMessage } from "../utils/apiError";


export type DocumentMasterData = {
  brands: Brand[];
  products: Product[];
  countries: Country[];
  languages: Language[];
  documentTypes: DocumentType[];
  documentSubtypes: DocumentSubtype[];
  channels: Channel[];
  audiences: Audience[];
};


const emptyMasterData: DocumentMasterData = {
  brands: [],
  products: [],
  countries: [],
  languages: [],
  documentTypes: [],
  documentSubtypes: [],
  channels: [],
  audiences: [],
};


export function useDocumentMasterData() {
  const [masterData, setMasterData] = useState<DocumentMasterData>(emptyMasterData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMasterData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const options = await getDocumentMasterDataOptions();
      setMasterData({
        brands: options.brands,
        products: options.products,
        countries: options.countries,
        languages: options.languages,
        documentTypes: options.document_types,
        documentSubtypes: options.document_subtypes,
        channels: options.channels,
        audiences: options.audiences,
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

import { apiClient } from "./client";
import type {
  Audience,
  Brand,
  Campaign,
  CampaignListParams,
  CampaignPayload,
  Channel,
  Country,
  CountryPayload,
  DesignAgency,
  DesignAgencyPayload,
  DocumentSubtype,
  DocumentSubtypeListParams,
  DocumentSubtypePayload,
  DocumentType,
  ExternalCountrySuggestion,
  ExternalRegionSuggestion,
  ExternalRegulatoryBodySuggestion,
  ExternalTimezoneSuggestion,
  Language,
  MasterDataListParams,
  MasterDataPayload,
  Product,
  ProductListParams,
  ProductPayload,
  Region,
  RegionPayload,
  SubTherapyArea,
  SubTherapyAreaListParams,
  SubTherapyAreaPayload,
  TherapeuticArea,
  TherapeuticAreaPayload,
} from "../types/masterData";


async function getList<T>(url: string, params?: MasterDataListParams): Promise<T[]> {
  const response = await apiClient.get<T[]>(url, { params });
  return response.data;
}

export type DocumentMasterDataOptions = {
  brands: Brand[];
  products: Product[];
  regions: Region[];
  countries: Country[];
  languages: Language[];
  document_types: DocumentType[];
  document_subtypes: DocumentSubtype[];
  channels: Channel[];
  audiences: Audience[];
  therapeutic_areas: TherapeuticArea[];
  sub_therapy_areas: SubTherapyArea[];
};

export type MaterialRequestMasterDataOptions = {
  regions: Region[];
  countries: Country[];
  brands: Brand[];
  products: Product[];
  therapeutic_areas: TherapeuticArea[];
  sub_therapy_areas: SubTherapyArea[];
  campaigns: Campaign[];
  document_types: DocumentType[];
  audiences: Audience[];
  channels: Channel[];
};


export async function getDocumentMasterDataOptions(): Promise<DocumentMasterDataOptions> {
  const response = await apiClient.get<DocumentMasterDataOptions>(
    "/master-data/document-options",
  );
  return response.data;
}


export async function getMaterialRequestMasterDataOptions(): Promise<MaterialRequestMasterDataOptions> {
  const response = await apiClient.get<MaterialRequestMasterDataOptions>(
    "/master-data/content-request-options",
  );
  return response.data;
}


export async function getExternalRegionSuggestions(
  search: string,
): Promise<ExternalRegionSuggestion[]> {
  const response = await apiClient.get<ExternalRegionSuggestion[]>(
    "/master-data/external/region-suggestions",
    { params: { search } },
  );
  return response.data;
}


export async function getExternalCountrySuggestions(
  search: string,
  region?: string,
): Promise<ExternalCountrySuggestion[]> {
  const response = await apiClient.get<ExternalCountrySuggestion[]>(
    "/master-data/external/country-suggestions",
    { params: { search, region } },
  );
  return response.data;
}


export async function getExternalTimezoneSuggestions(
  search: string,
): Promise<ExternalTimezoneSuggestion[]> {
  const response = await apiClient.get<ExternalTimezoneSuggestion[]>(
    "/master-data/external/timezone-suggestions",
    { params: { search } },
  );
  return response.data;
}


export async function getExternalRegulatoryBodySuggestions(
  search: string,
): Promise<ExternalRegulatoryBodySuggestion[]> {
  const response = await apiClient.get<ExternalRegulatoryBodySuggestion[]>(
    "/master-data/external/regulatory-body-suggestions",
    { params: { search } },
  );
  return response.data;
}


async function createItem<T, Payload>(url: string, payload: Payload): Promise<T> {
  const response = await apiClient.post<T>(url, payload);
  return response.data;
}


async function updateItem<T, Payload>(
  url: string,
  id: number,
  payload: Partial<Payload>,
): Promise<T> {
  const response = await apiClient.patch<T>(`${url}/${id}`, payload);
  return response.data;
}


async function deleteItem<T>(url: string, id: number): Promise<T> {
  const response = await apiClient.delete<T>(`${url}/${id}`);
  return response.data;
}


export async function getBrands(params?: MasterDataListParams): Promise<Brand[]> {
  return getList<Brand>("/master-data/brands", params);
}


export async function createBrand(payload: MasterDataPayload): Promise<Brand> {
  return createItem<Brand, MasterDataPayload>("/master-data/brands", payload);
}


export async function updateBrand(
  id: number,
  payload: Partial<MasterDataPayload>,
): Promise<Brand> {
  return updateItem<Brand, MasterDataPayload>("/master-data/brands", id, payload);
}


export async function deleteBrand(id: number): Promise<Brand> {
  return deleteItem<Brand>("/master-data/brands", id);
}


export async function getRegions(params?: MasterDataListParams): Promise<Region[]> {
  return getList<Region>("/master-data/regions", params);
}


export async function createRegion(payload: RegionPayload): Promise<Region> {
  return createItem<Region, RegionPayload>("/master-data/regions", payload);
}


export async function updateRegion(
  id: number,
  payload: Partial<RegionPayload>,
): Promise<Region> {
  return updateItem<Region, RegionPayload>("/master-data/regions", id, payload);
}


export async function deleteRegion(id: number): Promise<Region> {
  return deleteItem<Region>("/master-data/regions", id);
}


export async function getTherapeuticAreas(
  params?: MasterDataListParams,
): Promise<TherapeuticArea[]> {
  return getList<TherapeuticArea>("/master-data/therapeutic-areas", params);
}


export async function createTherapeuticArea(
  payload: TherapeuticAreaPayload,
): Promise<TherapeuticArea> {
  return createItem<TherapeuticArea, TherapeuticAreaPayload>(
    "/master-data/therapeutic-areas",
    payload,
  );
}


export async function updateTherapeuticArea(
  id: number,
  payload: Partial<TherapeuticAreaPayload>,
): Promise<TherapeuticArea> {
  return updateItem<TherapeuticArea, TherapeuticAreaPayload>(
    "/master-data/therapeutic-areas",
    id,
    payload,
  );
}


export async function deleteTherapeuticArea(id: number): Promise<TherapeuticArea> {
  return deleteItem<TherapeuticArea>("/master-data/therapeutic-areas", id);
}


export async function getProducts(params?: ProductListParams): Promise<Product[]> {
  const response = await apiClient.get<Product[]>("/master-data/products", { params });
  return response.data;
}


export async function createProduct(payload: ProductPayload): Promise<Product> {
  return createItem<Product, ProductPayload>("/master-data/products", payload);
}


export async function updateProduct(
  id: number,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  return updateItem<Product, ProductPayload>("/master-data/products", id, payload);
}


export async function deleteProduct(id: number): Promise<Product> {
  return deleteItem<Product>("/master-data/products", id);
}


export async function getCountries(params?: MasterDataListParams): Promise<Country[]> {
  return getList<Country>("/master-data/countries", params);
}


export async function createCountry(payload: CountryPayload): Promise<Country> {
  return createItem<Country, CountryPayload>("/master-data/countries", payload);
}


export async function updateCountry(
  id: number,
  payload: Partial<CountryPayload>,
): Promise<Country> {
  return updateItem<Country, CountryPayload>("/master-data/countries", id, payload);
}


export async function deleteCountry(id: number): Promise<Country> {
  return deleteItem<Country>("/master-data/countries", id);
}


export async function getSubTherapyAreas(
  params?: SubTherapyAreaListParams,
): Promise<SubTherapyArea[]> {
  const response = await apiClient.get<SubTherapyArea[]>(
    "/master-data/sub-therapy-areas",
    { params },
  );
  return response.data;
}


export async function createSubTherapyArea(
  payload: SubTherapyAreaPayload,
): Promise<SubTherapyArea> {
  return createItem<SubTherapyArea, SubTherapyAreaPayload>(
    "/master-data/sub-therapy-areas",
    payload,
  );
}


export async function updateSubTherapyArea(
  id: number,
  payload: Partial<SubTherapyAreaPayload>,
): Promise<SubTherapyArea> {
  return updateItem<SubTherapyArea, SubTherapyAreaPayload>(
    "/master-data/sub-therapy-areas",
    id,
    payload,
  );
}


export async function deleteSubTherapyArea(id: number): Promise<SubTherapyArea> {
  return deleteItem<SubTherapyArea>("/master-data/sub-therapy-areas", id);
}


export async function getLanguages(params?: MasterDataListParams): Promise<Language[]> {
  return getList<Language>("/master-data/languages", params);
}


export async function createLanguage(payload: MasterDataPayload): Promise<Language> {
  return createItem<Language, MasterDataPayload>("/master-data/languages", payload);
}


export async function updateLanguage(
  id: number,
  payload: Partial<MasterDataPayload>,
): Promise<Language> {
  return updateItem<Language, MasterDataPayload>("/master-data/languages", id, payload);
}


export async function deleteLanguage(id: number): Promise<Language> {
  return deleteItem<Language>("/master-data/languages", id);
}


export async function getDocumentTypes(params?: MasterDataListParams): Promise<DocumentType[]> {
  return getList<DocumentType>("/master-data/document-types", params);
}


export async function createDocumentType(
  payload: MasterDataPayload,
): Promise<DocumentType> {
  return createItem<DocumentType, MasterDataPayload>("/master-data/document-types", payload);
}


export async function updateDocumentType(
  id: number,
  payload: Partial<MasterDataPayload>,
): Promise<DocumentType> {
  return updateItem<DocumentType, MasterDataPayload>(
    "/master-data/document-types",
    id,
    payload,
  );
}


export async function deleteDocumentType(id: number): Promise<DocumentType> {
  return deleteItem<DocumentType>("/master-data/document-types", id);
}


export async function getDocumentSubtypes(
  params?: DocumentSubtypeListParams,
): Promise<DocumentSubtype[]> {
  const response = await apiClient.get<DocumentSubtype[]>(
    "/master-data/document-subtypes",
    { params },
  );
  return response.data;
}


export async function createDocumentSubtype(
  payload: DocumentSubtypePayload,
): Promise<DocumentSubtype> {
  return createItem<DocumentSubtype, DocumentSubtypePayload>(
    "/master-data/document-subtypes",
    payload,
  );
}


export async function updateDocumentSubtype(
  id: number,
  payload: Partial<DocumentSubtypePayload>,
): Promise<DocumentSubtype> {
  return updateItem<DocumentSubtype, DocumentSubtypePayload>(
    "/master-data/document-subtypes",
    id,
    payload,
  );
}


export async function deleteDocumentSubtype(id: number): Promise<DocumentSubtype> {
  return deleteItem<DocumentSubtype>("/master-data/document-subtypes", id);
}


export async function getChannels(params?: MasterDataListParams): Promise<Channel[]> {
  return getList<Channel>("/master-data/channels", params);
}


export async function createChannel(payload: MasterDataPayload): Promise<Channel> {
  return createItem<Channel, MasterDataPayload>("/master-data/channels", payload);
}


export async function updateChannel(
  id: number,
  payload: Partial<MasterDataPayload>,
): Promise<Channel> {
  return updateItem<Channel, MasterDataPayload>("/master-data/channels", id, payload);
}


export async function deleteChannel(id: number): Promise<Channel> {
  return deleteItem<Channel>("/master-data/channels", id);
}


export async function getAudiences(params?: MasterDataListParams): Promise<Audience[]> {
  return getList<Audience>("/master-data/audiences", params);
}


export async function createAudience(payload: MasterDataPayload): Promise<Audience> {
  return createItem<Audience, MasterDataPayload>("/master-data/audiences", payload);
}


export async function updateAudience(
  id: number,
  payload: Partial<MasterDataPayload>,
): Promise<Audience> {
  return updateItem<Audience, MasterDataPayload>("/master-data/audiences", id, payload);
}


export async function deleteAudience(id: number): Promise<Audience> {
  return deleteItem<Audience>("/master-data/audiences", id);
}


export async function getCampaigns(params?: CampaignListParams): Promise<Campaign[]> {
  const response = await apiClient.get<Campaign[]>("/master-data/campaigns", { params });
  return response.data;
}


export async function createCampaign(payload: CampaignPayload): Promise<Campaign> {
  return createItem<Campaign, CampaignPayload>("/master-data/campaigns", payload);
}


export async function updateCampaign(
  id: number,
  payload: Partial<CampaignPayload>,
): Promise<Campaign> {
  return updateItem<Campaign, CampaignPayload>("/master-data/campaigns", id, payload);
}


export async function deleteCampaign(id: number): Promise<Campaign> {
  return deleteItem<Campaign>("/master-data/campaigns", id);
}


export async function getDesignAgencies(
  params?: MasterDataListParams,
): Promise<DesignAgency[]> {
  return getList<DesignAgency>("/master-data/design-agencies", params);
}


export async function createDesignAgency(
  payload: DesignAgencyPayload,
): Promise<DesignAgency> {
  return createItem<DesignAgency, DesignAgencyPayload>(
    "/master-data/design-agencies",
    payload,
  );
}


export async function updateDesignAgency(
  id: number,
  payload: Partial<DesignAgencyPayload>,
): Promise<DesignAgency> {
  return updateItem<DesignAgency, DesignAgencyPayload>(
    "/master-data/design-agencies",
    id,
    payload,
  );
}


export async function deleteDesignAgency(id: number): Promise<DesignAgency> {
  return deleteItem<DesignAgency>("/master-data/design-agencies", id);
}

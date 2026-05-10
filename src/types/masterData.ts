export type MasterDataListParams = {
  include_inactive?: boolean;
};


export type ProductListParams = MasterDataListParams & {
  brand_id?: number;
  therapeutic_area_id?: number;
};


export type SubTherapyAreaListParams = MasterDataListParams & {
  therapy_area_id?: number;
};


export type DocumentSubtypeListParams = MasterDataListParams & {
  document_type_id?: number;
};


export type CampaignListParams = MasterDataListParams & {
  product_id?: number;
};


export type MasterDataBase = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type Brand = MasterDataBase;


export type Product = MasterDataBase & {
  brand_id: number;
  therapeutic_area_id?: number | null;
  brand?: Brand;
  therapeutic_area?: TherapeuticArea | null;
};


export type Country = MasterDataBase & {
  region_id?: number | null;
  region_name?: string | null;
};


export type Language = MasterDataBase;


export type DocumentType = MasterDataBase;


export type DocumentSubtype = MasterDataBase & {
  document_type_id: number;
  document_type?: DocumentType;
};


export type Channel = MasterDataBase;


export type Audience = MasterDataBase;


export type Region = MasterDataBase & {
  regulatory_body?: string | null;
  regional_head_id?: number | null;
  timezone?: string | null;
  country_ids?: number[] | null;
  language_codes?: string[] | null;
};


export type TherapeuticArea = MasterDataBase & {
  lead_user_id?: number | null;
  parent_id?: number | null;
  brand_guidelines_url?: string | null;
};


export type SubTherapyArea = MasterDataBase & {
  therapy_area_id: number;
  therapy_area_name?: string | null;
};


export type ExternalRegionSuggestion = {
  name: string;
  code: string;
  source: string;
  source_type: string;
  country_count: number;
  timezone: string | null;
  timezones: string[];
  country_codes: string[];
};


export type ExternalCountrySuggestion = {
  name: string;
  official_name: string | null;
  code: string;
  alpha3_code: string | null;
  region: string | null;
  subregion: string | null;
  world_bank_region: string | null;
  timezone: string | null;
  timezones: string[];
  source: string;
};


export type ExternalTimezoneSuggestion = {
  timezone: string;
  country_codes: string[];
  source: string;
};


export type ExternalRegulatoryBodySuggestion = {
  name: string;
  source_url: string | null;
  source: string;
  snippet: string | null;
};


export type Campaign = {
  id: number;
  name: string;
  product_id?: number | null;
  campaign_year?: number | null;
  strategic_theme?: string | null;
  brand_positioning?: string | null;
  global_campaign_owner_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  total_budget?: string | number | null;
  currency_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type DesignAgency = {
  id: number;
  name: string;
  contact_email?: string | null;
  contact_person?: string | null;
  specializations?: string[] | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  nda_on_file: boolean;
  preferred_region_ids?: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type MasterDataPayload = {
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
};


export type CountryPayload = {
  name: string;
  code: string;
  region_id?: number | null;
  is_active: boolean;
};


export type ProductPayload = MasterDataPayload & {
  brand_id: number;
  therapeutic_area_id?: number | null;
};


export type DocumentSubtypePayload = MasterDataPayload & {
  document_type_id: number;
};


export type RegionPayload = MasterDataPayload & {
  regulatory_body?: string | null;
  regional_head_id?: number | null;
  timezone?: string | null;
  country_ids?: number[] | null;
  language_codes?: string[] | null;
};


export type TherapeuticAreaPayload = MasterDataPayload & {
  lead_user_id?: number | null;
  parent_id?: number | null;
  brand_guidelines_url?: string | null;
};


export type SubTherapyAreaPayload = MasterDataPayload & {
  therapy_area_id: number;
};


export type CampaignPayload = {
  name: string;
  product_id?: number | null;
  campaign_year?: number | null;
  strategic_theme?: string | null;
  brand_positioning?: string | null;
  global_campaign_owner_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  total_budget?: number | null;
  currency_code?: string | null;
  is_active: boolean;
};


export type DesignAgencyPayload = {
  name: string;
  contact_email?: string | null;
  contact_person?: string | null;
  specializations?: string[] | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  nda_on_file: boolean;
  preferred_region_ids?: number[] | null;
  is_active: boolean;
};

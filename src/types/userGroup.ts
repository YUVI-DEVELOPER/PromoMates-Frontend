import type { Brand, Country, Product, Region, SubTherapyArea, TherapeuticArea } from "./masterData";
import type { User } from "./user";


export type UserGroupOption = {
  id: number;
  code: string;
  name: string;
  group_type: string | null;
  is_active: boolean;
};


export type UserGroup = UserGroupOption & {
  description: string | null;
  region_id: number | null;
  country_id: number | null;
  brand_id: number | null;
  product_id: number | null;
  therapeutic_area_id: number | null;
  therapy_area_id?: number | null;
  sub_therapy_area_id: number | null;
  region_name: string | null;
  country_name: string | null;
  brand_name: string | null;
  product_name: string | null;
  therapeutic_area_name: string | null;
  therapy_area_name?: string | null;
  sub_therapy_area_name: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
};


export type UserGroupMember = {
  id: number;
  group_id: number;
  user_id: number;
  is_primary: boolean;
  created_at: string;
  user?: Pick<User, "id" | "full_name" | "email"> | null;
  group?: UserGroupOption | null;
};


export type UserGroupPayload = {
  code: string;
  name: string;
  description?: string | null;
  group_type?: string | null;
  region_id?: number | null;
  country_id?: number | null;
  brand_id?: number | null;
  product_id?: number | null;
  therapeutic_area_id?: number | null;
  therapy_area_id?: number | null;
  sub_therapy_area_id?: number | null;
  is_active: boolean;
};


export type UserGroupListParams = {
  search?: string;
  group_type?: string;
  region_id?: number;
  country_id?: number;
  brand_id?: number;
  product_id?: number;
  therapeutic_area_id?: number;
  sub_therapy_area_id?: number;
  include_inactive?: boolean;
};


export type UserGroupMemberAddPayload = {
  user_id: number;
  is_primary?: boolean;
};


export type UserGroupReferenceData = {
  regions: Region[];
  countries: Country[];
  brands: Brand[];
  products: Product[];
  therapeuticAreas: TherapeuticArea[];
  subTherapyAreas: SubTherapyArea[];
};

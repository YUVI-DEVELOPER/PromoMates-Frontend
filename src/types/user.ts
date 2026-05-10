import type { UserGroupOption } from "./userGroup";


export type Role = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Permission = {
  key: string;
  label: string;
  description: string;
};

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  manager_id?: number | null;
  designation?: string | null;
  department?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  roles: Role[];
  groups: UserGroupOption[];
  user_group_ids?: number[];
  region_ids?: number[];
  country_ids?: number[];
  therapy_area_ids?: number[];
  sub_therapy_area_ids?: number[];
};

export type UserCreatePayload = {
  full_name: string;
  email: string;
  phone_number?: string | null;
  manager_id?: number | null;
  designation?: string | null;
  department?: string | null;
  password: string;
  is_active: boolean;
  is_superuser: boolean;
  role_ids: number[];
  group_ids?: number[];
  user_group_ids?: number[];
  region_ids?: number[];
  country_ids?: number[];
  therapy_area_ids?: number[];
  sub_therapy_area_ids?: number[];
};

export type UserUpdatePayload = {
  full_name?: string;
  email?: string;
  phone_number?: string | null;
  manager_id?: number | null;
  designation?: string | null;
  department?: string | null;
  password?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  role_ids?: number[];
  group_ids?: number[];
  user_group_ids?: number[];
  region_ids?: number[];
  country_ids?: number[];
  therapy_area_ids?: number[];
  sub_therapy_area_ids?: number[];
};

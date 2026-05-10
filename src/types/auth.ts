import type { Role } from "./user";
import type { UserGroupOption } from "./userGroup";

export type User = {
  id: number;
  email: string;
  full_name: string;
  is_superuser: boolean;
  roles: Role[];
  groups: UserGroupOption[];
  user_group_ids?: number[];
  region_ids?: number[];
  country_ids?: number[];
  therapy_area_ids?: number[];
  sub_therapy_area_ids?: number[];
  permissions: string[];
};

export type CurrentUserResponse = User;

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

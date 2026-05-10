export type LookupCategory = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_editable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};


export type LookupCategoryPayload = {
  code: string;
  name: string;
  description?: string | null;
  is_editable?: boolean;
  is_active?: boolean;
};


export type LookupValue = {
  id: number;
  category_id: number;
  code: string;
  label: string;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type LookupValuePayload = {
  category_id: number;
  code: string;
  label: string;
  description?: string | null;
  is_active?: boolean;
};


export type LookupSortOrderDirection = "low_to_high" | "high_to_low";

export type LookupSortOrderParity = "all" | "even" | "odd";


export type LookupListParams = {
  include_inactive?: boolean;
  category_id?: number;
  category_code?: string;
  sort_order_direction?: LookupSortOrderDirection;
  sort_order_parity?: LookupSortOrderParity;
};


export type LookupOption = {
  code: string;
  label: string;
};


export type SystemOptions = Record<string, LookupOption[]>;

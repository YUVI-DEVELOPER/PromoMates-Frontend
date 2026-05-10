export type AssignmentMode = "QUEUE" | "DIRECT" | string;


export type RoutingResolution = {
  assignment_found: boolean;
  assignment_type: "USER" | "GROUP" | "QUEUE" | null;
  assigned_user_id: number | null;
  assigned_group_id: number | null;
  assignment_rule_id: number | null;
  reason: string;
  warnings: string[];
};


export type MLRReviewerResolution = RoutingResolution & {
  review_role_type: "MEDICAL" | "LEGAL" | "REGULATORY";
};


export type RoutingPreview = {
  derived_region: {
    id: number | null;
    name: string | null;
    code: string | null;
    reason: string;
    warnings: string[];
  };
  regional_marketing_team: RoutingResolution;
  therapy_lead: RoutingResolution;
  medical_reviewer: RoutingResolution;
  designer: RoutingResolution;
  mlr_reviewers: MLRReviewerResolution[];
};


export type RegionalMarketingAssignment = {
  id: number;
  region_id: number;
  team_group_id: number;
  assignment_mode: AssignmentMode;
  backup_group_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type RegionalMarketingAssignmentPayload = {
  region_id: number;
  team_group_id: number;
  assignment_mode: AssignmentMode;
  backup_group_id?: number | null;
  is_active: boolean;
};


export type TherapyLeadAssignment = {
  id: number;
  region_id: number | null;
  country_id: number | null;
  therapy_area_id: number;
  sub_therapy_area_id: number | null;
  content_type_id: number | null;
  assigned_user_id: number;
  backup_user_id: number | null;
  priority_order: number;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type TherapyLeadAssignmentPayload = Omit<TherapyLeadAssignment, "id" | "created_at" | "updated_at">;


export type MedicalReviewerAssignment = {
  id: number;
  region_id: number | null;
  country_id: number | null;
  therapy_area_id: number;
  sub_therapy_area_id: number | null;
  content_type_id: number | null;
  brand_id?: number | null;
  product_id?: number | null;
  assigned_user_id: number | null;
  reviewer_group_id: number | null;
  assignment_mode: AssignmentMode;
  backup_user_id: number | null;
  priority_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type MedicalReviewerAssignmentPayload = Omit<MedicalReviewerAssignment, "id" | "created_at" | "updated_at">;


export type DesignerAssignment = {
  id: number;
  region_id: number | null;
  country_id: number | null;
  therapy_area_id: number;
  sub_therapy_area_id: number | null;
  assigned_user_id: number | null;
  designer_group_id: number | null;
  assignment_mode: AssignmentMode;
  backup_user_id: number | null;
  priority_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type DesignerAssignmentPayload = Omit<DesignerAssignment, "id" | "created_at" | "updated_at">;


export type MLRReviewerAssignment = {
  id: number;
  review_role_type: "MEDICAL" | "LEGAL" | "REGULATORY";
  region_id: number | null;
  country_id: number | null;
  therapy_area_id: number | null;
  sub_therapy_area_id: number | null;
  content_type_id: number | null;
  assigned_user_id: number | null;
  reviewer_group_id: number | null;
  assignment_mode: AssignmentMode;
  priority_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};


export type MLRReviewerAssignmentPayload = Omit<MLRReviewerAssignment, "id" | "created_at" | "updated_at">;


export type AnyRoutingAssignment =
  | RegionalMarketingAssignment
  | TherapyLeadAssignment
  | MedicalReviewerAssignment
  | DesignerAssignment
  | MLRReviewerAssignment;


export type AnyRoutingAssignmentPayload =
  | RegionalMarketingAssignmentPayload
  | TherapyLeadAssignmentPayload
  | MedicalReviewerAssignmentPayload
  | DesignerAssignmentPayload
  | MLRReviewerAssignmentPayload;

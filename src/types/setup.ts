export type SetupChecklistItem = {
  key: string;
  label: string;
  is_complete: boolean;
  is_required: boolean;
  count: number;
  action_label: string;
  action_path: string;
};

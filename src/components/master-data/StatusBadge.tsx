import { StatusBadge as UiStatusBadge } from "../ui/StatusBadge";


type StatusBadgeProps = {
  isActive: boolean;
};


export function StatusBadge({ isActive }: StatusBadgeProps) {
  return <UiStatusBadge status={isActive ? "ACTIVE" : "INACTIVE"} />;
}

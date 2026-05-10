import { WorkflowStepper, type WorkflowStep } from "../ui/WorkflowStepper";
import type { WorkflowStage } from "../../types/workflow";


type WorkflowStepperPreviewProps = {
  stages: WorkflowStage[];
};


export function WorkflowStepperPreview({ stages }: WorkflowStepperPreviewProps) {
  const orderedStages = [...stages].sort((first, second) => first.stage_order - second.stage_order);
  const steps: WorkflowStep[] = orderedStages.map((stage) => ({
    label: stage.name,
    status: "pending",
    helperText: `${stage.required_role_ref?.name ?? stage.required_role ?? "Unassigned"} - ${stage.due_days} day${
      stage.due_days === 1 ? "" : "s"
    }`,
  }));

  return (
    <WorkflowStepper
      title="Stage Preview"
      subtitle="Review stages are shown in configured order."
      steps={steps}
    />
  );
}

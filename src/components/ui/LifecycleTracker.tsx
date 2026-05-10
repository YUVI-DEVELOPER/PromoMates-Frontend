import { WorkflowStepper, type WorkflowStep } from "./WorkflowStepper";


type LifecycleTrackerProps = {
  steps: WorkflowStep[];
};


export function LifecycleTracker({ steps }: LifecycleTrackerProps) {
  return (
    <WorkflowStepper
      title="Lifecycle Tracker"
      subtitle="Only the active and completed stages are expanded below."
      steps={steps}
    />
  );
}

import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { NextActionCard } from "../components/ui/NextActionCard";
import { PageContainer } from "../components/ui/PageContainer";
import { PageHeroSummary } from "../components/ui/PageHeroSummary";


export function Reports() {
  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Insights"
        title="Reports"
        subtitle="Compliance dashboards and review metrics will support operational oversight, audit readiness, and MLR performance tracking."
        status="PENDING"
        statusLabel="Future Reporting Module"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Review Cycle Time" value="-" helperText="Awaiting workflow data" status="neutral" />
        <KpiCard label="Approval Throughput" value="-" helperText="Awaiting event data" status="neutral" />
        <KpiCard label="Overdue Tasks" value={0} helperText="No task data yet" status="warning" />
        <KpiCard label="Compliance Metrics" value="-" helperText="Future audit metrics" status="info" />
      </div>

      <EmptyState
        title="Reports will appear after workflow events are captured"
        description="Cycle time, approval throughput, overdue tasks, and compliance metrics will be available after review workflows are implemented."
      />

      <NextActionCard
        title="No reporting logic was added in UI-1."
        description="This keeps the frontend redesign aligned with the current backend scope while still presenting a polished placeholder."
      />
    </PageContainer>
  );
}

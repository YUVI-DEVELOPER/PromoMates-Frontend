import { EmptyState } from "../../components/ui/EmptyState";
import { KpiCard } from "../../components/ui/KpiCard";
import { NextActionCard } from "../../components/ui/NextActionCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";


export function ComplianceSettings() {
  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Admin Console"
        title="Compliance Settings"
        subtitle="Compliance settings will define policy defaults and review controls that keep promotional material handling audit-ready."
        status="PENDING"
        statusLabel="Future Configuration"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Review Policies" value={0} helperText="Future policy controls" status="neutral" />
        <KpiCard label="Approval Controls" value={0} helperText="Future release rules" status="neutral" />
        <KpiCard label="Expiry Rules" value={0} helperText="Future expiry defaults" status="warning" />
        <KpiCard label="Audit Defaults" value={0} helperText="Future evidence settings" status="info" />
      </div>

      <EmptyState
        title="Compliance settings are not active yet"
        description="Policy defaults, approval controls, expiry rules, and audit behavior will be configured in a later phase."
      />

      <NextActionCard
        title="Document metadata remains the compliance foundation."
        description="This phase keeps compliance settings as a polished placeholder while preserving existing backend behavior."
      />
    </PageContainer>
  );
}

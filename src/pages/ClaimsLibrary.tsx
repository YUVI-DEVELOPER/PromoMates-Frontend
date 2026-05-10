import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { NextActionCard } from "../components/ui/NextActionCard";
import { PageContainer } from "../components/ui/PageContainer";
import { PageHeroSummary } from "../components/ui/PageHeroSummary";


export function ClaimsLibrary() {
  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Claims"
        title="Claims Library"
        subtitle="Approved claims and reusable claim language will be managed here for compliant promotional messaging."
        status="PENDING"
        statusLabel="Future Module"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Approved Claims" value={0} helperText="Reusable claims" status="success" />
        <KpiCard label="References" value={0} helperText="Supporting evidence" status="info" />
        <KpiCard label="Expiring Soon" value={0} helperText="Claims needing attention" status="warning" />
        <KpiCard label="Archived" value={0} helperText="Retired claim text" status="neutral" />
      </div>

      <EmptyState
        title="Claims controls are not active yet"
        description="Reusable claim text, supporting references, expiry monitoring, and document traceability will appear in a future phase."
      />

      <NextActionCard
        title="Use document metadata and file upload for this phase."
        description="Claims logic has intentionally not been implemented in UI-1 to keep this phase focused on frontend polish."
      />
    </PageContainer>
  );
}

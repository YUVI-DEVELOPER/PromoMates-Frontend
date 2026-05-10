import { ConfigSummaryCard } from "../../components/ui/ConfigSummaryCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { masterDataModules } from "../../navigation";


const moduleDescriptions: Record<string, string> = {
  Brands: "Products and documents are grouped by brand for ownership, reporting, and review context.",
  Products: "Promotional materials are linked to products so reviewers can evaluate claims in context.",
  Regions: "Regional operating groups support localization, ownership, and future request routing.",
  "Therapeutic Areas": "Therapy-area taxonomy connects products and campaigns to scientific context.",
  "Sub-Therapy Areas": "Sub-therapy taxonomy gives routing rules a more precise therapy context.",
  Campaigns: "Campaign references prepare the system for planning and future request workflows.",
  "Design Agencies": "Agency records track creative partners for future design coordination.",
  Countries: "Rules, labels, and approvals can differ by country or market.",
  Languages: "Language controls help separate localized materials and translated assets.",
  "Document Types": "Document types define the broad category used for routing and search.",
  "Document Subtypes": "Subtypes classify admin-defined formats under document types.",
  Channels: "Channels identify where the material will be distributed or used.",
  Audiences: "Audience values distinguish admin-defined target groups.",
};


export function MasterDataLanding() {
  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Admin Console"
        title="Master Data"
        subtitle="Configure controlled options users select when classifying documents, markets, channels, and audiences."
        status="ACTIVE"
        statusLabel="Configuration Active"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {masterDataModules.map((module) => (
          <ConfigSummaryCard
            key={module.label}
            title={module.label}
            description={moduleDescriptions[module.label] ?? module.description}
            to={module.path}
            manageLabel="Open CRUD"
          />
        ))}
      </div>
    </PageContainer>
  );
}

import { ConfigSummaryCard } from "../../components/ui/ConfigSummaryCard";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";


const adminCards = [
  {
    title: "Users and Access",
    description: "Manage user accounts, roles, superuser access, and active account status.",
    to: "/admin/users",
  },
  {
    title: "Role Master",
    description: "Create dynamic roles and assign backend permissions.",
    to: "/admin/roles",
  },
  {
    title: "Master Data",
    description: "Configure brands, products, countries, languages, channels, and audiences.",
    to: "/admin/master-data",
  },
  {
    title: "Lookup Master",
    description: "Manage configurable lookup values for request, compliance, and sales forms.",
    to: "/admin/lookups",
  },
  {
    title: "Setup Checklist",
    description: "Verify the minimum setup needed before real manual lifecycle testing.",
    to: "/admin/setup-checklist",
  },
  {
    title: "Workflows",
    description: "Future setup for MLR routing, review stages, due dates, and escalations.",
    to: "/admin/workflows",
  },
  {
    title: "Document Numbering",
    description: "Future configuration for identifiers, market codes, and sequence rules.",
    to: "/admin/document-numbering",
  },
  {
    title: "Compliance Settings",
    description: "Future policy defaults for approval controls, expiry rules, and audit behavior.",
    to: "/admin/compliance-settings",
  },
];


export function AdminConsole() {
  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Administration"
        title="Admin Console"
        subtitle="Configure users, controlled master data, workflow settings, numbering rules, and compliance defaults for PromoCon operations."
        status="ACTIVE"
        statusLabel="Admin Ready"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminCards.map((card) => (
          <ConfigSummaryCard
            key={card.to}
            title={card.title}
            description={card.description}
            to={card.to}
          />
        ))}
      </div>
    </PageContainer>
  );
}

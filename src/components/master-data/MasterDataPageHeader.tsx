import { PageHeroSummary } from "../ui/PageHeroSummary";


type MasterDataPageHeaderProps = {
  title: string;
  description: string;
  createLabel: string;
  onCreate: () => void;
};


export function MasterDataPageHeader({
  title,
  description,
  createLabel,
  onCreate,
}: MasterDataPageHeaderProps) {
  return (
    <PageHeroSummary
      eyebrow="Master Data"
      title={title}
      subtitle={description}
      status="ACTIVE"
      statusLabel="Configurable"
      primaryAction={
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {createLabel}
        </button>
      }
    />
  );
}

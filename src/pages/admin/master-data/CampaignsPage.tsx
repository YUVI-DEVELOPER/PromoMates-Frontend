import { useEffect, useMemo, useState } from "react";

import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  getProducts,
  updateCampaign,
} from "../../../api/masterData";
import {
  FlexibleMasterDataCrudPage,
  type FlexibleField,
  type FlexibleFormValues,
} from "../../../components/master-data/FlexibleMasterDataCrudPage";
import type { MasterDataTableColumn } from "../../../components/master-data/MasterDataTable";
import { StatusBadge } from "../../../components/master-data/StatusBadge";
import type { Campaign, CampaignPayload, Product } from "../../../types/masterData";


function nullableNumber(value: unknown): number | null {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : null;
}


function nullableString(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}


function formatMoney(campaign: Campaign): string {
  if (campaign.total_budget === null || campaign.total_budget === undefined) {
    return "Not set";
  }

  const amount = Number(campaign.total_budget);
  if (!Number.isFinite(amount)) {
    return String(campaign.total_budget);
  }

  return `${campaign.currency_code ?? ""} ${amount.toLocaleString()}`.trim();
}


function getInitialValues(campaign: Campaign | null): FlexibleFormValues {
  return {
    name: campaign?.name ?? "",
    product_id: campaign?.product_id ? String(campaign.product_id) : "",
    campaign_year: campaign?.campaign_year ? String(campaign.campaign_year) : "",
    strategic_theme: campaign?.strategic_theme ?? "",
    brand_positioning: campaign?.brand_positioning ?? "",
    start_date: campaign?.start_date ?? "",
    end_date: campaign?.end_date ?? "",
    total_budget: campaign?.total_budget ? String(campaign.total_budget) : "",
    currency_code: campaign?.currency_code ?? "",
    is_active: campaign?.is_active ?? true,
  };
}


function buildPayload(values: FlexibleFormValues): CampaignPayload {
  return {
    name: String(values.name).trim(),
    product_id: nullableNumber(values.product_id),
    campaign_year: nullableNumber(values.campaign_year),
    strategic_theme: nullableString(values.strategic_theme),
    brand_positioning: nullableString(values.brand_positioning),
    start_date: nullableString(values.start_date),
    end_date: nullableString(values.end_date),
    total_budget: nullableNumber(values.total_budget),
    currency_code: nullableString(values.currency_code)?.toUpperCase() ?? null,
    is_active: values.is_active === true,
  };
}


export function CampaignsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const nextProducts = await getProducts({ include_inactive: false });
        if (isMounted) {
          setProducts(nextProducts);
        }
      } catch {
        if (isMounted) {
          setProducts([]);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const campaignFields = useMemo<FlexibleField[]>(
    () => [
      { name: "name", label: "Name", type: "text", required: true, fullWidth: true },
      {
        name: "product_id",
        label: "Product",
        type: "select",
        placeholder: "No product",
        options: products.map((product) => ({
          value: String(product.id),
          label: `${product.name} (${product.code})`,
        })),
      },
      { name: "campaign_year", label: "Campaign Year", type: "number" },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "total_budget", label: "Total Budget", type: "number" },
      { name: "currency_code", label: "Currency Code", type: "text", transform: "uppercase" },
      { name: "strategic_theme", label: "Strategic Theme", type: "textarea", fullWidth: true },
      { name: "brand_positioning", label: "Brand Positioning", type: "textarea", fullWidth: true },
      { name: "is_active", label: "Active", type: "checkbox" },
    ],
    [products],
  );

  const campaignColumns = useMemo<MasterDataTableColumn<Campaign>[]>(
    () => [
      {
        header: "Campaign",
        render: (campaign) => (
          <div>
            <p className="font-medium text-slate-950">{campaign.name}</p>
            <p className="mt-1 text-xs text-slate-500">ID {campaign.id}</p>
          </div>
        ),
      },
      {
        header: "Product",
        render: (campaign) => {
          const product = campaign.product_id ? productById.get(campaign.product_id) : null;
          return product ? (
            <div>
              <p className="font-medium text-slate-900">{product.name}</p>
              <p className="mt-1 text-xs text-slate-500">{product.code}</p>
            </div>
          ) : (
            <span className="text-slate-500">Not set</span>
          );
        },
      },
      {
        header: "Year",
        render: (campaign) => campaign.campaign_year ?? <span className="text-slate-500">Not set</span>,
      },
      {
        header: "Budget",
        render: (campaign) => (
          <span className="whitespace-nowrap text-slate-700">{formatMoney(campaign)}</span>
        ),
      },
      {
        header: "Status",
        render: (campaign) => <StatusBadge isActive={campaign.is_active} />,
      },
    ],
    [productById],
  );

  return (
    <FlexibleMasterDataCrudPage<Campaign, CampaignPayload>
      title="Campaigns"
      entityLabel="Campaign"
      description="Manage campaign planning references used by future request and material workflows."
      fields={campaignFields}
      columns={campaignColumns}
      loadItems={getCampaigns}
      createItem={createCampaign}
      updateItem={updateCampaign}
      deleteItem={deleteCampaign}
      getInitialValues={getInitialValues}
      buildPayload={buildPayload}
      getSearchValues={(campaign) => {
        const product = campaign.product_id ? productById.get(campaign.product_id) : null;
        return [
          campaign.name,
          campaign.strategic_theme ?? "",
          campaign.brand_positioning ?? "",
          campaign.currency_code ?? "",
          product?.name ?? "",
          product?.code ?? "",
        ];
      }}
    />
  );
}

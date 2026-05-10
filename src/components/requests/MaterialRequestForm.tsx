import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { downloadContentRequestReferenceMaterial } from "../../api/materialRequests";
import { getLookupValuesByCategory } from "../../api/lookups";
import { useAuth } from "../../context/AuthContext";
import { useWorkspaceTabs } from "../../context/WorkspaceTabsContext";
import type {
  ContentRequestReferenceMaterial,
  MaterialRequest,
  MaterialRequestCreatePayload,
} from "../../types/materialRequest";
import type { LookupValue } from "../../types/lookup";
import type {
  Audience,
  Brand,
  Campaign,
  Channel,
  Country,
  DocumentType,
  Product,
  Region,
  SubTherapyArea,
  TherapeuticArea,
} from "../../types/masterData";
import { formatFileSize } from "../../utils/fileSize";
import { SummaryCard } from "../ui/SummaryCard";


type RequestFormValues = {
  title: string;
  description: string;
  region_id: string;
  country_id: string;
  brand_id: string;
  product_id: string;
  therapeutic_area_id: string;
  sub_therapy_area_id: string;
  campaign_id: string;
  material_type_id: string;
  target_audience_id: string;
  target_audience_ids: string[];
  additional_country_ids: string[];
  channel_id: string;
  priority: string;
  business_objective: string;
  key_messages: string;
  target_hcp_specialty: string;
  required_by_date: string;
  estimated_quantity: string;
  budget_allocated: string;
  currency_code: string;
  reference_notes: string;
  local_requirements: string;
  budget_code: string;
  urgency_justification: string;
};


type RequestFormErrorKey = keyof RequestFormValues | "reference_materials";
type FormErrors = Partial<Record<RequestFormErrorKey, string>>;
type SubmitAction = "draft" | "submit";


type MaterialRequestFormProps = {
  mode: "create" | "edit";
  request?: MaterialRequest;
  regions: Region[];
  countries: Country[];
  brands: Brand[];
  products: Product[];
  therapeuticAreas: TherapeuticArea[];
  subTherapyAreas: SubTherapyArea[];
  campaigns: Campaign[];
  documentTypes: DocumentType[];
  audiences: Audience[];
  channels: Channel[];
  isLoadingMasterData: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  serverFieldErrors?: Record<string, string>;
  initialDraftPayload?: MaterialRequestCreatePayload | null;
  onDraftChange?: (payload: MaterialRequestCreatePayload) => void;
  onSaveDraft?: (
    payload: MaterialRequestCreatePayload,
    options: { pendingReferenceFiles: File[] },
  ) => Promise<void>;
  onSubmit: (
    payload: MaterialRequestCreatePayload,
    options: { action: SubmitAction; pendingReferenceFiles: File[] },
  ) => Promise<void>;
  onRemoveReferenceMaterial?: (materialId: number) => Promise<void>;
};


const emptyValues: RequestFormValues = {
  title: "",
  description: "",
  region_id: "",
  country_id: "",
  brand_id: "",
  product_id: "",
  therapeutic_area_id: "",
  sub_therapy_area_id: "",
  campaign_id: "",
  material_type_id: "",
  target_audience_id: "",
  target_audience_ids: [],
  additional_country_ids: [],
  channel_id: "",
  priority: "",
  business_objective: "",
  key_messages: "",
  target_hcp_specialty: "",
  required_by_date: "",
  estimated_quantity: "",
  budget_allocated: "",
  currency_code: "",
  reference_notes: "",
  local_requirements: "",
  budget_code: "",
  urgency_justification: "",
};


function getInitialValues(request?: MaterialRequest): RequestFormValues {
  if (!request) {
    return emptyValues;
  }

  return {
    title: request.title ?? "",
    description: request.description ?? "",
    region_id: request.region_id ? String(request.region_id) : "",
    country_id: request.country_id ? String(request.country_id) : "",
    brand_id: request.brand_id ? String(request.brand_id) : "",
    product_id: request.product_id ? String(request.product_id) : "",
    therapeutic_area_id: request.therapeutic_area_id ? String(request.therapeutic_area_id) : "",
    sub_therapy_area_id: request.sub_therapy_area_id ? String(request.sub_therapy_area_id) : "",
    campaign_id: request.campaign_id ? String(request.campaign_id) : "",
    material_type_id: request.material_type_id ? String(request.material_type_id) : "",
    target_audience_id: request.target_audience_id ? String(request.target_audience_id) : "",
    target_audience_ids: (request.target_audience_ids ?? (request.target_audience_id ? [request.target_audience_id] : [])).map(String),
    additional_country_ids: (request.additional_country_ids ?? []).map(String),
    channel_id: request.channel_id ? String(request.channel_id) : "",
    priority: request.priority ?? "",
    business_objective: request.business_objective ?? "",
    key_messages: request.key_messages ?? "",
    target_hcp_specialty: request.target_hcp_specialty ?? "",
    required_by_date: request.required_by_date ?? "",
    estimated_quantity: request.estimated_quantity ? String(request.estimated_quantity) : "",
    budget_allocated: request.budget_allocated ? String(request.budget_allocated) : "",
    currency_code: request.currency_code ?? "",
    reference_notes: request.reference_notes ?? "",
    local_requirements: request.local_requirements ?? "",
    budget_code: request.budget_code ?? "",
    urgency_justification: request.urgency_justification ?? "",
  };
}


function getInitialValuesFromPayload(payload?: MaterialRequestCreatePayload | null): RequestFormValues {
  if (!payload) {
    return emptyValues;
  }

  const countryId = payload.country_id ?? payload.primary_country_id;
  const therapyAreaId = payload.therapeutic_area_id ?? payload.therapy_area_id;
  const materialTypeId = payload.material_type_id ?? payload.content_type_id;
  const requiredByDate = payload.required_by_date ?? payload.in_market_date;

  return {
    title: payload.title ?? payload.request_title ?? "",
    description: payload.description ?? payload.brief_description ?? "",
    region_id: payload.region_id ? String(payload.region_id) : "",
    country_id: countryId ? String(countryId) : "",
    brand_id: payload.brand_id ? String(payload.brand_id) : "",
    product_id: payload.product_id ? String(payload.product_id) : "",
    therapeutic_area_id: therapyAreaId ? String(therapyAreaId) : "",
    sub_therapy_area_id: payload.sub_therapy_area_id ? String(payload.sub_therapy_area_id) : "",
    campaign_id: payload.campaign_id ? String(payload.campaign_id) : "",
    material_type_id: materialTypeId ? String(materialTypeId) : "",
    target_audience_id: payload.target_audience_id ? String(payload.target_audience_id) : "",
    target_audience_ids: (payload.target_audience_ids ?? (payload.target_audience_id ? [payload.target_audience_id] : [])).map(String),
    additional_country_ids: (payload.additional_country_ids ?? []).map(String),
    channel_id: payload.channel_id ? String(payload.channel_id) : "",
    priority: payload.priority ?? "",
    business_objective: payload.business_objective ?? "",
    key_messages: payload.key_messages ?? "",
    target_hcp_specialty: payload.target_hcp_specialty ?? "",
    required_by_date: requiredByDate ?? "",
    estimated_quantity: payload.estimated_quantity != null ? String(payload.estimated_quantity) : "",
    budget_allocated: payload.budget_allocated != null ? String(payload.budget_allocated) : "",
    currency_code: payload.currency_code ?? "",
    reference_notes: payload.reference_notes ?? "",
    local_requirements: payload.local_requirements ?? "",
    budget_code: payload.budget_code ?? "",
    urgency_justification: payload.urgency_justification ?? "",
  };
}


function optionalNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}


function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}


function lookupOptionLabel(value: LookupValue): string {
  return value.label || value.code;
}


function buildPayloadFromValues(values: RequestFormValues): MaterialRequestCreatePayload {
  const targetAudienceIds = values.target_audience_ids.map(Number).filter(Number.isFinite);
  const additionalCountryIds = values.additional_country_ids.map(Number).filter(Number.isFinite);

  return {
    title: optionalText(values.title),
    request_title: optionalText(values.title),
    description: optionalText(values.description),
    brief_description: optionalText(values.description),
    region_id: optionalNumber(values.region_id),
    country_id: optionalNumber(values.country_id),
    primary_country_id: optionalNumber(values.country_id),
    brand_id: optionalNumber(values.brand_id),
    product_id: optionalNumber(values.product_id),
    therapeutic_area_id: optionalNumber(values.therapeutic_area_id),
    therapy_area_id: optionalNumber(values.therapeutic_area_id),
    sub_therapy_area_id: optionalNumber(values.sub_therapy_area_id),
    campaign_id: optionalNumber(values.campaign_id),
    material_type_id: optionalNumber(values.material_type_id),
    content_type_id: optionalNumber(values.material_type_id),
    target_audience_id: targetAudienceIds[0] ?? optionalNumber(values.target_audience_id),
    target_audience_ids: targetAudienceIds,
    additional_country_ids: additionalCountryIds,
    channel_id: optionalNumber(values.channel_id),
    priority: values.priority || undefined,
    business_objective: optionalText(values.business_objective),
    key_messages: optionalText(values.key_messages),
    target_hcp_specialty: optionalText(values.target_hcp_specialty)?.toUpperCase() ?? null,
    required_by_date: values.required_by_date || null,
    in_market_date: values.required_by_date || null,
    estimated_quantity: optionalNumber(values.estimated_quantity),
    budget_allocated: optionalNumber(values.budget_allocated),
    currency_code: optionalText(values.currency_code)?.toUpperCase() ?? null,
    reference_notes: optionalText(values.reference_notes),
    local_requirements: optionalText(values.local_requirements),
    budget_code: optionalText(values.budget_code)?.toUpperCase() ?? null,
    urgency_justification: optionalText(values.urgency_justification),
  };
}


const allowedReferenceMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "video/mp4",
]);

const maxReferenceFiles = 10;
const maxReferenceFileSizeBytes = 50 * 1024 * 1024;
const requiredPriorityCodes = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const validationFieldOrder: RequestFormErrorKey[] = [
  "title",
  "description",
  "country_id",
  "region_id",
  "additional_country_ids",
  "therapeutic_area_id",
  "sub_therapy_area_id",
  "brand_id",
  "product_id",
  "material_type_id",
  "target_audience_ids",
  "priority",
  "required_by_date",
  "budget_code",
  "currency_code",
  "urgency_justification",
  "reference_materials",
];

const validationFieldIds: Record<RequestFormErrorKey, string> = {
  title: "request-title",
  description: "request-description",
  region_id: "request-country",
  country_id: "request-country",
  brand_id: "request-brand",
  product_id: "request-product",
  therapeutic_area_id: "request-therapeutic-area",
  sub_therapy_area_id: "request-sub-therapy",
  campaign_id: "request-campaign",
  material_type_id: "request-material-type",
  target_audience_id: "request-target-audience",
  target_audience_ids: "request-target-audience",
  additional_country_ids: "request-additional-countries",
  channel_id: "request-channel",
  target_hcp_specialty: "request-specialty",
  priority: "request-priority",
  business_objective: "request-business-objective",
  key_messages: "request-key-messages",
  local_requirements: "request-local-requirements",
  required_by_date: "request-required-date",
  estimated_quantity: "request-estimated-quantity",
  budget_allocated: "request-budget",
  currency_code: "request-currency",
  reference_notes: "request-reference-notes",
  budget_code: "request-budget-code",
  urgency_justification: "request-urgency",
  reference_materials: "request-reference-materials",
};


function normalizePriorityCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}


function isCriticalPriority(value: string): boolean {
  return normalizePriorityCode(value) === "CRITICAL";
}


function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}


function firstErrorKey(errors: Partial<Record<string, string | undefined>>): RequestFormErrorKey | null {
  return validationFieldOrder.find((fieldName) => Boolean(errors[fieldName])) ?? null;
}


function focusFirstError(errors: Partial<Record<string, string | undefined>>) {
  const fieldName = firstErrorKey(errors);
  if (!fieldName) {
    return;
  }

  window.requestAnimationFrame(() => {
    const field = document.getElementById(validationFieldIds[fieldName]);
    if (!field) {
      return;
    }

    const target = field.closest("[data-validation-field]") ?? field;
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLButtonElement
    ) {
      field.focus({ preventScroll: true });
    }
  });
}


export function MaterialRequestForm({
  mode,
  request,
  regions,
  countries,
  brands,
  products,
  therapeuticAreas,
  subTherapyAreas,
  campaigns,
  documentTypes,
  audiences,
  channels,
  isLoadingMasterData,
  isSubmitting,
  submitError,
  serverFieldErrors = {},
  initialDraftPayload,
  onDraftChange,
  onSaveDraft,
  onSubmit,
  onRemoveReferenceMaterial,
}: MaterialRequestFormProps) {
  const { setActiveTabDirty } = useWorkspaceTabs();
  const { user, isSuperuser } = useAuth();
  const initialValues = useMemo(
    () => request ? getInitialValues(request) : getInitialValuesFromPayload(initialDraftPayload),
    [initialDraftPayload, request?.id],
  );
  const [values, setValues] = useState<RequestFormValues>(() =>
    initialValues,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [pendingReferenceFiles, setPendingReferenceFiles] = useState<File[]>([]);
  const [hasUserEditedValues, setHasUserEditedValues] = useState(false);
  const [isRemovingReferenceId, setIsRemovingReferenceId] = useState<number | null>(null);
  const [requestPriorityValues, setRequestPriorityValues] = useState<LookupValue[]>([]);
  const [currencyValues, setCurrencyValues] = useState<LookupValue[]>([]);
  const [hcpSpecialtyValues, setHcpSpecialtyValues] = useState<LookupValue[]>([]);

  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setHasUserEditedValues(false);
  }, [initialValues]);

  useEffect(() => {
    if (mode !== "create" || !onDraftChange || !hasUserEditedValues) {
      return;
    }
    onDraftChange(buildPayloadFromValues(values));
  }, [hasUserEditedValues, mode, onDraftChange, values]);

  useEffect(() => {
    const hasServerFieldErrors = Object.keys(serverFieldErrors).length > 0;
    setErrors((currentErrors) => ({
      ...currentErrors,
      ...serverFieldErrors,
    }));
    if (hasServerFieldErrors) {
      focusFirstError(serverFieldErrors);
    }
  }, [serverFieldErrors]);

  useEffect(() => {
    setActiveTabDirty(JSON.stringify(values) !== JSON.stringify(initialValues) || pendingReferenceFiles.length > 0);

    return () => {
      setActiveTabDirty(false);
    };
  }, [initialValues, pendingReferenceFiles.length, setActiveTabDirty, values]);

  useEffect(() => {
    let isMounted = true;

    async function loadLookups() {
      const [priorityResult, currencyResult, specialtyResult] = await Promise.allSettled([
        getLookupValuesByCategory("REQUEST_PRIORITY"),
        getLookupValuesByCategory("CURRENCY"),
        getLookupValuesByCategory("HCP_SPECIALTY"),
      ]);

      if (!isMounted) {
        return;
      }

      setRequestPriorityValues(priorityResult.status === "fulfilled" ? priorityResult.value : []);
      setCurrencyValues(currencyResult.status === "fulfilled" ? currencyResult.value : []);
      setHcpSpecialtyValues(specialtyResult.status === "fulfilled" ? specialtyResult.value : []);
    }

    void loadLookups();

    return () => {
      isMounted = false;
    };
  }, []);

  const authorizedCountryIds = useMemo(() => {
    if (isSuperuser) {
      return null;
    }

    const ids = new Set<number>();
    (user?.country_ids ?? []).forEach((countryId) => ids.add(countryId));
    const regionIds = new Set(user?.region_ids ?? []);
    countries.forEach((country) => {
      if (country.region_id && regionIds.has(country.region_id)) {
        ids.add(country.id);
      }
    });
    return ids;
  }, [countries, isSuperuser, user?.country_ids, user?.region_ids]);

  const countryOptions = useMemo(() => {
    if (authorizedCountryIds === null) {
      return countries;
    }
    const allowedCountries = countries.filter((country) => authorizedCountryIds.has(country.id));
    const selectedCountry = countries.find((country) => country.id === Number(values.country_id));
    if (selectedCountry && !allowedCountries.some((country) => country.id === selectedCountry.id)) {
      return [...allowedCountries, selectedCountry];
    }
    return allowedCountries;
  }, [authorizedCountryIds, countries, values.country_id]);

  const countrySetupWarning =
    !isSuperuser && !isLoadingMasterData && countryOptions.length === 0
      ? "No country scope configured for this user. Please contact administrator."
      : null;

  useEffect(() => {
    if (mode !== "create" || values.country_id || isLoadingMasterData || authorizedCountryIds === null) {
      return;
    }
    if (authorizedCountryIds.size !== 1) {
      return;
    }
    const scopedCountryId = Array.from(authorizedCountryIds)[0];
    const selectedCountry = countries.find((country) => country.id === scopedCountryId);
    if (selectedCountry) {
      setValues((currentValues) => ({
        ...currentValues,
        country_id: String(scopedCountryId),
        region_id: selectedCountry.region_id ? String(selectedCountry.region_id) : "",
      }));
    }
  }, [authorizedCountryIds, countries, isLoadingMasterData, mode, values.country_id]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (values.brand_id && product.brand_id !== Number(values.brand_id)) {
        return false;
      }
      if (values.therapeutic_area_id && product.therapeutic_area_id !== Number(values.therapeutic_area_id)) {
        return false;
      }
      return true;
    });
  }, [products, values.brand_id, values.therapeutic_area_id]);

  const filteredSubTherapyAreas = useMemo(() => {
    if (!values.therapeutic_area_id) {
      return subTherapyAreas;
    }
    return subTherapyAreas.filter((area) => area.therapy_area_id === Number(values.therapeutic_area_id));
  }, [subTherapyAreas, values.therapeutic_area_id]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === Number(values.country_id)) ?? null,
    [countries, values.country_id],
  );

  const selectedRegion = useMemo(() => {
    const regionId = selectedCountry?.region_id ?? (values.region_id ? Number(values.region_id) : null);
    if (!regionId) {
      return null;
    }
    return regions.find((region) => region.id === regionId) ?? null;
  }, [regions, selectedCountry?.region_id, values.region_id]);

  const filteredCampaigns = useMemo(() => {
    if (!values.product_id) {
      return campaigns;
    }

    return campaigns.filter((campaign) => campaign.product_id === Number(values.product_id));
  }, [campaigns, values.product_id]);

  useEffect(() => {
    if (values.product_id && !filteredProducts.some((product) => product.id === Number(values.product_id))) {
      setValues((currentValues) => ({
        ...currentValues,
        product_id: "",
        campaign_id: "",
      }));
    }
  }, [filteredProducts, values.product_id]);

  const priorityOptions = useMemo(() => {
    const configuredOptions = requestPriorityValues.map((priority) => ({
      value: normalizePriorityCode(priority.code),
      label: lookupOptionLabel(priority),
    }));
    if (!configuredOptions.some((option) => option.value === values.priority)) {
      return values.priority ? [...configuredOptions, { value: values.priority, label: values.priority }] : configuredOptions;
    }
    return configuredOptions;
  }, [requestPriorityValues, values.priority]);

  const prioritySetupWarning = useMemo(() => {
    const configuredCodes = new Set(requestPriorityValues.map((priority) => normalizePriorityCode(priority.code)));
    const missingCodes = requiredPriorityCodes.filter((priorityCode) => !configuredCodes.has(priorityCode));
    return missingCodes.length > 0
      ? "REQUEST_PRIORITY lookup must include Critical, High, Medium, and Low."
      : null;
  }, [requestPriorityValues]);

  const currencyOptions = useMemo(() => {
    const options = currencyValues.map((currency) => ({
      value: currency.code,
      label: lookupOptionLabel(currency),
    }));
    const currentCurrency = values.currency_code.trim().toUpperCase();
    if (currentCurrency && !options.some((option) => option.value === currentCurrency)) {
      return [...options, { value: currentCurrency, label: currentCurrency }];
    }
    return options;
  }, [currencyValues, values.currency_code]);

  const hcpSpecialtyOptions = useMemo(() => {
    const options = hcpSpecialtyValues.map((specialty) => ({
      value: specialty.code,
      label: lookupOptionLabel(specialty),
    }));
    const currentSpecialty = values.target_hcp_specialty.trim().toUpperCase();
    if (currentSpecialty && !options.some((option) => option.value === currentSpecialty)) {
      return [...options, { value: currentSpecialty, label: currentSpecialty }];
    }
    return options;
  }, [hcpSpecialtyValues, values.target_hcp_specialty]);

  function updateValue<FieldName extends keyof RequestFormValues>(
    fieldName: FieldName,
    value: RequestFormValues[FieldName],
  ) {
    setHasUserEditedValues(true);
    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [fieldName]: value,
      };

      if (fieldName === "therapeutic_area_id") {
        nextValues.sub_therapy_area_id = "";
        nextValues.product_id = "";
        nextValues.campaign_id = "";
      }

      if (fieldName === "country_id") {
        const selectedCountry = countries.find((country) => country.id === Number(value));
        nextValues.region_id = selectedCountry?.region_id ? String(selectedCountry.region_id) : "";
      }

      if (fieldName === "brand_id") {
        nextValues.product_id = "";
        nextValues.campaign_id = "";
      }

      if (fieldName === "product_id") {
        const selectedProduct = products.find((product) => product.id === Number(value));
        if (selectedProduct?.brand_id) {
          nextValues.brand_id = String(selectedProduct.brand_id);
        }
        nextValues.campaign_id = "";
      }

      return nextValues;
    });
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  function validateReferenceFiles(files: File[]): string | null {
    const existingCount = request?.reference_materials?.length ?? 0;
    if (existingCount + files.length > maxReferenceFiles) {
      return "Reference Materials are limited to 10 files.";
    }

    const invalidType = files.find((file) => !allowedReferenceMimeTypes.has(file.type));
    if (invalidType) {
      return `${invalidType.name} is not supported. Upload PDF, DOCX, PPTX, JPG, PNG, or MP4.`;
    }

    const oversizedFile = files.find((file) => file.size > maxReferenceFileSizeBytes);
    if (oversizedFile) {
      return `${oversizedFile.name} exceeds the 50 MB per-file limit.`;
    }

    return null;
  }

  function validateForm(action: SubmitAction): FormErrors {
    const nextErrors: FormErrors = {};

    if (values.title.trim()) {
      if (values.title.trim().length > 200) {
        nextErrors.title = "Request title must be 200 characters or fewer.";
      }
      if (!/^[A-Za-z0-9 &-]+$/.test(values.title.trim())) {
        nextErrors.title = "Request title can contain only letters, numbers, spaces, hyphen, and ampersand.";
      }
    } else if (action === "submit") {
      nextErrors.title = "Request title is required.";
    }

    if (values.required_by_date && values.required_by_date < todayIsoDate()) {
      nextErrors.required_by_date = "In-market date cannot be in the past.";
    }

    if (values.currency_code && values.currency_code.trim().length !== 3) {
      nextErrors.currency_code = "Use a 3-letter currency code.";
    }

    if (values.budget_code && !/^[A-Z]{2}-[0-9]{6}$/.test(values.budget_code.trim().toUpperCase())) {
      nextErrors.budget_code = "Use format AA-123456.";
    }

    const referenceError = validateReferenceFiles(pendingReferenceFiles);
    if (referenceError) {
      nextErrors.reference_materials = referenceError;
    }

    if (action === "submit") {
      if (!values.material_type_id) {
        nextErrors.material_type_id = "Content type is required.";
      }
      if (!values.therapeutic_area_id) {
        nextErrors.therapeutic_area_id = "Therapy area is required.";
      }
      if (filteredSubTherapyAreas.length > 0 && !values.sub_therapy_area_id) {
        nextErrors.sub_therapy_area_id = "Sub-therapy is required for the selected therapy area.";
      }
      if (values.target_audience_ids.length === 0) {
        nextErrors.target_audience_ids = "Select at least one target audience.";
      }
      if (!values.country_id) {
        nextErrors.country_id = "Primary country is required.";
      }
      if (!selectedRegion && values.country_id) {
        nextErrors.region_id = "Selected country is not mapped to an active region. Please configure country-region mapping.";
      }
      if (!values.brand_id) {
        nextErrors.brand_id = "Brand is required.";
      }
      if (!values.product_id) {
        nextErrors.product_id = "Product is required.";
      }
      if (!values.required_by_date) {
        nextErrors.required_by_date = "In-market date is required.";
      }
      if (!values.priority) {
        nextErrors.priority = "Priority is required.";
      }
      if (prioritySetupWarning) {
        nextErrors.priority = prioritySetupWarning;
      }
      if (isCriticalPriority(values.priority) && values.urgency_justification.trim().length < 100) {
        nextErrors.urgency_justification = "Urgency justification is required for Critical priority and must be at least 100 characters.";
      }
      if (values.description.trim().length < 50) {
        nextErrors.description = "Brief/Description must be at least 50 characters.";
      }
    }

    return nextErrors;
  }

  async function submitForm(action: SubmitAction) {
    const payload = buildPayloadFromValues(values);

    const nextErrors = validateForm(action);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    if (action === "draft" && onSaveDraft) {
      await onSaveDraft(payload, { pendingReferenceFiles });
      setPendingReferenceFiles([]);
      return;
    }

    await onSubmit(
      payload,
      { action, pendingReferenceFiles },
    );
    setPendingReferenceFiles([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitForm("draft");
  }

  function handleReferenceFileSelect(files: FileList | null) {
    if (!files) {
      return;
    }
    const nextFiles = [...pendingReferenceFiles, ...Array.from(files)];
    const referenceError = validateReferenceFiles(nextFiles);
    if (referenceError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        reference_materials: referenceError,
      }));
      return;
    }
    setPendingReferenceFiles(nextFiles);
    setErrors((currentErrors) => ({
      ...currentErrors,
      reference_materials: undefined,
    }));
  }

  async function removeExistingReferenceMaterial(material: ContentRequestReferenceMaterial) {
    if (!onRemoveReferenceMaterial) {
      return;
    }
    setIsRemovingReferenceId(material.id);
    setErrors((currentErrors) => ({ ...currentErrors, reference_materials: undefined }));
    try {
      await onRemoveReferenceMaterial(material.id);
    } catch {
      setErrors((currentErrors) => ({
        ...currentErrors,
        reference_materials: "Reference material could not be removed.",
      }));
    } finally {
      setIsRemovingReferenceId(null);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {submitError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      )}
      {(countrySetupWarning || prioritySetupWarning) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {[countrySetupWarning, prioritySetupWarning].filter(Boolean).join(" ")}
        </div>
      )}

      <SummaryCard title="Content Request Summary">
        <div className="grid gap-4">
          <TextField
            id="request-title"
            label="Request Title"
            value={values.title}
            error={errors.title}
            maxLength={200}
            onChange={(value) => updateValue("title", value)}
          />

          <TextAreaField
            id="request-description"
            label="Brief / Description"
            value={values.description}
            error={errors.description}
            rows={3}
            onChange={(value) => updateValue("description", value)}
          />
        </div>
      </SummaryCard>

      <SummaryCard title="Business Context">
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField
            id="request-country"
            label="Primary Country"
            value={values.country_id}
            disabled={isLoadingMasterData || Boolean(countrySetupWarning)}
            error={errors.country_id}
            helperText="Defaults from your country scope when available."
            onChange={(value) => updateValue("country_id", value)}
          >
            <option value="">Select country</option>
            {countryOptions.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </SelectField>

          <ReadOnlyField
            label="Region"
            value={selectedRegion?.name ?? "Derived after primary country"}
            helperText="Derived automatically from selected country."
            error={errors.region_id}
          />

          <MultiSelectField
            id="request-additional-countries"
            label="Additional Countries"
            values={values.additional_country_ids}
            disabled={isLoadingMasterData}
            options={countryOptions}
            error={errors.additional_country_ids}
            helperText="Additional countries are limited to your authorized scope."
            onChange={(nextValues) => updateValue("additional_country_ids", nextValues)}
          />

          <SelectField
            id="request-therapeutic-area"
            label="Therapy Area"
            value={values.therapeutic_area_id}
            disabled={isLoadingMasterData}
            error={errors.therapeutic_area_id}
            onChange={(value) => updateValue("therapeutic_area_id", value)}
          >
            <option value="">No therapeutic area</option>
            {therapeuticAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="request-sub-therapy"
            label="Sub-Therapy"
            value={values.sub_therapy_area_id}
            disabled={isLoadingMasterData}
            error={errors.sub_therapy_area_id}
            onChange={(value) => updateValue("sub_therapy_area_id", value)}
          >
            <option value="">No sub-therapy</option>
            {filteredSubTherapyAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="request-brand"
            label="Brand"
            value={values.brand_id}
            disabled={isLoadingMasterData}
            error={errors.brand_id}
            onChange={(value) => updateValue("brand_id", value)}
          >
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="request-product"
            label="Product"
            value={values.product_id}
            disabled={isLoadingMasterData}
            error={errors.product_id}
            onChange={(value) => updateValue("product_id", value)}
          >
            <option value="">No product</option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="request-campaign"
            label="Campaign"
            value={values.campaign_id}
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("campaign_id", value)}
          >
            <option value="">No campaign</option>
            {filteredCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="request-material-type"
            label="Content Type"
            value={values.material_type_id}
            disabled={isLoadingMasterData}
            error={errors.material_type_id}
            onChange={(value) => updateValue("material_type_id", value)}
          >
            <option value="">No material type</option>
            {documentTypes.map((documentType) => (
              <option key={documentType.id} value={documentType.id}>
                {documentType.name}
              </option>
            ))}
          </SelectField>
        </div>
      </SummaryCard>

      <SummaryCard title="Audience And Channel">
        <div className="grid gap-4 lg:grid-cols-3">
          <MultiSelectField
            id="request-target-audience"
            label="Target Audience"
            values={values.target_audience_ids}
            disabled={isLoadingMasterData}
            options={audiences}
            error={errors.target_audience_ids}
            onChange={(nextValues) => {
              updateValue("target_audience_ids", nextValues);
              updateValue("target_audience_id", nextValues[0] ?? "");
            }}
          />

          <SelectField
            id="request-channel"
            label="Channel"
            value={values.channel_id}
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("channel_id", value)}
          >
            <option value="">No channel</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="request-specialty"
            label="Target HCP Specialty"
            value={values.target_hcp_specialty}
            disabled={hcpSpecialtyOptions.length === 0}
            onChange={(value) => updateValue("target_hcp_specialty", value)}
          >
            <option value="">No specialty</option>
            {hcpSpecialtyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
      </SummaryCard>

      <SummaryCard title="Messaging">
        <div className="grid gap-4">
          <TextAreaField
            id="request-business-objective"
            label="Business Objective"
            value={values.business_objective}
            rows={3}
            onChange={(value) => updateValue("business_objective", value)}
          />

          <TextAreaField
            id="request-local-requirements"
            label="Local Requirements"
            value={values.local_requirements}
            rows={3}
            onChange={(value) => updateValue("local_requirements", value)}
          />

          <TextAreaField
            id="request-key-messages"
            label="Key Messages"
            value={values.key_messages}
            rows={4}
            onChange={(value) => updateValue("key_messages", value)}
          />
        </div>
      </SummaryCard>

      <SummaryCard title="Timeline And Budget">
        <div className="grid gap-4 lg:grid-cols-4">
          <SelectField
            id="request-priority"
            label="Priority"
            value={values.priority}
            disabled={priorityOptions.length === 0}
            error={errors.priority}
            onChange={(value) => updateValue("priority", value)}
          >
            <option value="">Select priority</option>
            {priorityOptions.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </SelectField>

          <TextField
            id="request-required-date"
            label="In-Market Date"
            type="date"
            value={values.required_by_date}
            error={errors.required_by_date}
            helperText="Lead-time requirement: at least 6 months when strict mode is enabled."
            onChange={(value) => updateValue("required_by_date", value)}
          />

          <TextField
            id="request-budget-code"
            label="Budget Code"
            value={values.budget_code}
            error={errors.budget_code}
            helperText="Format: IN-123456."
            onChange={(value) => updateValue("budget_code", value.toUpperCase())}
          />

          <SelectField
            id="request-currency"
            label="Currency Code"
            value={values.currency_code}
            disabled={currencyOptions.length === 0}
            error={errors.currency_code}
            onChange={(value) => updateValue("currency_code", value.toUpperCase())}
          >
            <option value="">No currency</option>
            {currencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <TextAreaField
            id="request-urgency"
            label="Urgency Justification"
            value={values.urgency_justification}
            error={errors.urgency_justification}
            helperText="Required for Critical priority, minimum 100 characters."
            rows={3}
            onChange={(value) => updateValue("urgency_justification", value)}
          />
        </div>
      </SummaryCard>

      <SummaryCard title="References">
        <div className="grid gap-4">
          <TextAreaField
            id="request-reference-notes"
            label="Reference Notes"
            value={values.reference_notes}
            rows={4}
            onChange={(value) => updateValue("reference_notes", value)}
          />
          <ReferenceMaterialsField
            existingMaterials={request?.reference_materials ?? []}
            pendingFiles={pendingReferenceFiles}
            error={errors.reference_materials}
            isRemovingReferenceId={isRemovingReferenceId}
            onSelectFiles={handleReferenceFileSelect}
            onRemovePendingFile={(index) =>
              setPendingReferenceFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))
            }
            onRemoveExistingMaterial={removeExistingReferenceMaterial}
            onDownloadExistingMaterial={(material) => {
              if (request?.id) {
                void downloadContentRequestReferenceMaterial(request.id, material);
              }
            }}
          />
        </div>
      </SummaryCard>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          to={mode === "edit" && request ? `/requests/${request.id}` : "/requests"}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void submitForm("submit")}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting
            ? "Submitting..."
            : request?.status === "RETURNED_TO_SPOC" || request?.status === "SPOC_REVISION_IN_PROGRESS"
              ? "Resubmit to Regional Marketing"
              : "Submit Request"}
        </button>
      </div>
    </form>
  );
}


type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  type?: "text" | "date" | "number";
  required?: boolean;
  error?: string;
  helperText?: string;
  maxLength?: number;
  onChange: (value: string) => void;
};


type ReadOnlyFieldProps = {
  label: string;
  value: string;
  helperText?: string;
  error?: string;
};


function ReadOnlyField({ label, value, helperText, error }: ReadOnlyFieldProps) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-2 flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
        {value}
      </div>
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


type MultiSelectFieldProps = {
  id: string;
  label: string;
  values: string[];
  options: Array<{ id: number; name: string }>;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  onChange: (values: string[]) => void;
};


function MultiSelectField({ id, label, values, options, disabled = false, error, helperText, onChange }: MultiSelectFieldProps) {
  return (
    <div data-validation-field>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        multiple
        value={values}
        disabled={disabled}
        onChange={(event) =>
          onChange(Array.from(event.currentTarget.selectedOptions).map((option) => option.value))
        }
        className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


type ReferenceMaterialsFieldProps = {
  existingMaterials: ContentRequestReferenceMaterial[];
  pendingFiles: File[];
  error?: string;
  isRemovingReferenceId: number | null;
  onSelectFiles: (files: FileList | null) => void;
  onRemovePendingFile: (index: number) => void;
  onRemoveExistingMaterial: (material: ContentRequestReferenceMaterial) => void;
  onDownloadExistingMaterial: (material: ContentRequestReferenceMaterial) => void;
};


function ReferenceMaterialsField({
  existingMaterials,
  pendingFiles,
  error,
  isRemovingReferenceId,
  onSelectFiles,
  onRemovePendingFile,
  onRemoveExistingMaterial,
  onDownloadExistingMaterial,
}: ReferenceMaterialsFieldProps) {
  return (
    <div data-validation-field>
      <label className="block text-sm font-medium text-slate-700" htmlFor="request-reference-materials">
        Reference Materials
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Maximum 10 files, 50MB each. PDF, DOCX, PPTX, JPG, PNG, MP4.
      </p>
      <input
        id="request-reference-materials"
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.mp4,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,video/mp4"
        onChange={(event) => {
          onSelectFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
        className="mt-3 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
      />
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}

      {(existingMaterials.length > 0 || pendingFiles.length > 0) && (
        <div className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200">
          {existingMaterials.map((material) => (
            <div key={material.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{material.original_filename}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {material.mime_type} / {formatFileSize(material.file_size)} /{" "}
                  {material.uploaded_by?.full_name ?? `User ${material.uploaded_by_id}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onDownloadExistingMaterial(material)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={isRemovingReferenceId === material.id}
                  onClick={() => onRemoveExistingMaterial(material)}
                  className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRemovingReferenceId === material.id ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
          {pendingFiles.map((file, index) => (
            <div key={`${file.name}-${file.size}-${index}`} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {file.type || "Unknown type"} / {formatFileSize(file.size)} / Pending upload
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemovePendingFile(index)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function TextField({
  id,
  label,
  value,
  type = "text",
  required = false,
  error,
  helperText,
  maxLength,
  onChange,
}: TextFieldProps) {
  return (
    <div data-validation-field>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        min={type === "number" ? 0 : undefined}
        step={id === "request-budget" ? "0.01" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  onChange: (value: string) => void;
};


function SelectField({
  id,
  label,
  value,
  disabled = false,
  error,
  helperText,
  children,
  onChange,
}: SelectFieldProps) {
  return (
    <div data-validation-field>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {children}
      </select>
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


type TextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  rows: number;
  error?: string;
  helperText?: string;
  onChange: (value: string) => void;
};


function TextAreaField({ id, label, value, rows, error, helperText, onChange }: TextAreaFieldProps) {
  return (
    <div data-validation-field>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

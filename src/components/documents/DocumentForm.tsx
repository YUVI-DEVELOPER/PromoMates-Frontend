import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import type {
  DocumentCreatePayload,
  DocumentDetail,
} from "../../types/document";
import type {
  Audience,
  Brand,
  Channel,
  Country,
  DocumentSubtype,
  DocumentType,
  Language,
  Product,
} from "../../types/masterData";
import { SummaryCard } from "../ui/SummaryCard";
import { FormDraftNotice } from "../ui/FormDraftNotice";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";


type DocumentFormValues = {
  title: string;
  description: string;
  brand_id: string;
  product_id: string;
  country_id: string;
  language_id: string;
  document_type_id: string;
  document_subtype_id: string;
  channel_id: string;
  audience_id: string;
  intended_use: string;
  keywords: string;
  expiry_date: string;
};


type FormErrors = Partial<Record<keyof DocumentFormValues, string>>;


type DocumentFormProps = {
  mode: "create" | "edit";
  document?: DocumentDetail;
  brands: Brand[];
  products: Product[];
  countries: Country[];
  languages: Language[];
  documentTypes: DocumentType[];
  documentSubtypes: DocumentSubtype[];
  channels: Channel[];
  audiences: Audience[];
  isLoadingMasterData: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  initialRequestId?: string | null;
  onSubmit: (payload: DocumentCreatePayload) => Promise<void>;
};


const emptyValues: DocumentFormValues = {
  title: "",
  description: "",
  brand_id: "",
  product_id: "",
  country_id: "",
  language_id: "",
  document_type_id: "",
  document_subtype_id: "",
  channel_id: "",
  audience_id: "",
  intended_use: "",
  keywords: "",
  expiry_date: "",
};


function getInitialValues(document?: DocumentDetail): DocumentFormValues {
  if (!document) {
    return emptyValues;
  }

  return {
    title: document.title,
    description: document.description ?? "",
    brand_id: String(document.brand_id),
    product_id: String(document.product_id),
    country_id: String(document.country_id),
    language_id: String(document.language_id),
    document_type_id: String(document.document_type_id),
    document_subtype_id: document.document_subtype_id ? String(document.document_subtype_id) : "",
    channel_id: document.channel_id ? String(document.channel_id) : "",
    audience_id: document.audience_id ? String(document.audience_id) : "",
    intended_use: document.intended_use ?? "",
    keywords: document.keywords ?? "",
    expiry_date: document.expiry_date ?? "",
  };
}


function optionalNumber(value: string): number | null {
  return value ? Number(value) : null;
}


function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}


export function DocumentForm({
  mode,
  document,
  brands,
  products,
  countries,
  languages,
  documentTypes,
  documentSubtypes,
  channels,
  audiences,
  isLoadingMasterData,
  isSubmitting,
  submitError,
  initialRequestId,
  onSubmit,
}: DocumentFormProps) {
  const draftKey = mode === "edit" && document
    ? `document:edit:${document.id}`
    : `document:create:${initialRequestId ?? "standalone"}`;
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useRedisFormDraft<DocumentFormValues>(draftKey);
  const [values, setValues] = useState<DocumentFormValues>(() =>
    getInitialValues(document),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;
    const initialValues = getInitialValues(document);

    setValues(initialValues);
    setErrors({});

    void loadDraft().then((draft) => {
      if (isMounted && draft) {
        setValues({ ...initialValues, ...draft.payload });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [document?.id, loadDraft]);

  const filteredProducts = useMemo(() => {
    if (!values.brand_id) {
      return products;
    }

    return products.filter((product) => product.brand_id === Number(values.brand_id));
  }, [products, values.brand_id]);

  const filteredSubtypes = useMemo(() => {
    if (!values.document_type_id) {
      return documentSubtypes;
    }

    return documentSubtypes.filter(
      (subtype) => subtype.document_type_id === Number(values.document_type_id),
    );
  }, [documentSubtypes, values.document_type_id]);

  const isRequiredMasterDataMissing =
    brands.length === 0 ||
    products.length === 0 ||
    countries.length === 0 ||
    languages.length === 0 ||
    documentTypes.length === 0;

  function updateValue<FieldName extends keyof DocumentFormValues>(
    fieldName: FieldName,
    value: DocumentFormValues[FieldName],
  ) {
    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [fieldName]: value,
      };

      if (fieldName === "brand_id") {
        nextValues.product_id = "";
      }

      if (fieldName === "document_type_id") {
        nextValues.document_subtype_id = "";
      }

      return nextValues;
    });
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!values.title.trim()) {
      nextErrors.title = "Title is required.";
    }
    if (!values.brand_id) {
      nextErrors.brand_id = "Brand is required.";
    }
    if (!values.product_id) {
      nextErrors.product_id = "Product is required.";
    }
    if (!values.country_id) {
      nextErrors.country_id = "Country is required.";
    }
    if (!values.language_id) {
      nextErrors.language_id = "Language is required.";
    }
    if (!values.document_type_id) {
      nextErrors.document_type_id = "Document type is required.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || isRequiredMasterDataMissing) {
      return;
    }

    try {
      await onSubmit({
        title: values.title.trim(),
        description: optionalText(values.description),
        request_id: document?.request_id ?? initialRequestId ?? null,
        brand_id: Number(values.brand_id),
        product_id: Number(values.product_id),
        country_id: Number(values.country_id),
        language_id: Number(values.language_id),
        document_type_id: Number(values.document_type_id),
        document_subtype_id: optionalNumber(values.document_subtype_id),
        channel_id: optionalNumber(values.channel_id),
        audience_id: optionalNumber(values.audience_id),
        intended_use: optionalText(values.intended_use),
        keywords: optionalText(values.keywords),
        expiry_date: values.expiry_date || null,
      });
      await clearDraft();
    } catch {
      return;
    }
  }

  async function handleSaveDraft() {
    await saveDraft(values);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {submitError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      )}

      <FormDraftNotice
        state={draftState}
        updatedAt={draftUpdatedAt}
        expiresAt={draftExpiresAt}
        error={draftError}
      />

      {isRequiredMasterDataMissing && !isLoadingMasterData && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Master data is missing. Please configure brands, products, countries, languages, and document types first.
        </div>
      )}

      <SummaryCard
        title="Basic Information"
        subtitle="Name the material and provide enough context for reviewers."
      >
        <div className="grid gap-4">
          <TextField
            id="document-title"
            label="Title"
            value={values.title}
            error={errors.title}
            required
            onChange={(value) => updateValue("title", value)}
          />

          <TextAreaField
            id="document-description"
            label="Description"
            value={values.description}
            rows={3}
            onChange={(value) => updateValue("description", value)}
          />
        </div>
      </SummaryCard>

      <SummaryCard
        title="Classification"
        subtitle="Controlled metadata keeps materials searchable and audit-ready."
      >
        <div className="grid gap-4 lg:grid-cols-2">

          <SelectField
            id="document-brand"
            label="Brand"
            value={values.brand_id}
            error={errors.brand_id}
            required
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("brand_id", value)}
          >
            <option value="">Select brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="document-product"
            label="Product"
            value={values.product_id}
            error={errors.product_id}
            required
            disabled={isLoadingMasterData || !values.brand_id}
            onChange={(value) => updateValue("product_id", value)}
          >
            <option value="">Select product</option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="document-country"
            label="Country"
            value={values.country_id}
            error={errors.country_id}
            required
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("country_id", value)}
          >
            <option value="">Select country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="document-language"
            label="Language"
            value={values.language_id}
            error={errors.language_id}
            required
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("language_id", value)}
          >
            <option value="">Select language</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="document-type"
            label="Document Type"
            value={values.document_type_id}
            error={errors.document_type_id}
            required
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("document_type_id", value)}
          >
            <option value="">Select type</option>
            {documentTypes.map((documentType) => (
              <option key={documentType.id} value={documentType.id}>
                {documentType.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="document-subtype"
            label="Document Subtype"
            value={values.document_subtype_id}
            disabled={isLoadingMasterData || !values.document_type_id}
            onChange={(value) => updateValue("document_subtype_id", value)}
          >
            <option value="">No subtype</option>
            {filteredSubtypes.map((subtype) => (
              <option key={subtype.id} value={subtype.id}>
                {subtype.name}
              </option>
            ))}
          </SelectField>
        </div>
      </SummaryCard>

      <SummaryCard
        title="Distribution Details"
        subtitle="Define where and how this material is intended to be used."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <SelectField
            id="document-channel"
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
            id="document-audience"
            label="Audience"
            value={values.audience_id}
            disabled={isLoadingMasterData}
            onChange={(value) => updateValue("audience_id", value)}
          >
            <option value="">No audience</option>
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.name}
              </option>
            ))}
          </SelectField>

          <TextField
            id="document-expiry-date"
            label="Expiry Date"
            type="date"
            value={values.expiry_date}
            onChange={(value) => updateValue("expiry_date", value)}
          />
        </div>
      </SummaryCard>

      <SummaryCard
        title="Usage Notes"
        subtitle="Capture intended use and keywords that help reviewers understand context."
      >
        <div className="grid gap-4">
          <TextAreaField
            id="document-intended-use"
            label="Intended Use"
            value={values.intended_use}
            rows={3}
            onChange={(value) => updateValue("intended_use", value)}
          />

          <TextAreaField
            id="document-keywords"
            label="Keywords"
            value={values.keywords}
            rows={2}
            onChange={(value) => updateValue("keywords", value)}
          />
        </div>
      </SummaryCard>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          to={mode === "edit" && document ? `/library/${document.id}` : "/library"}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={isSubmitting || draftState === "saving"}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {draftState === "saving" ? "Saving draft..." : "Save Draft"}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoadingMasterData || isRequiredMasterDataMissing}
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create Review Document"
              : "Save Metadata"}
        </button>
      </div>
    </form>
  );
}


type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  type?: "text" | "date";
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
};


function TextField({
  id,
  label,
  value,
  type = "text",
  required = false,
  error,
  onChange,
}: TextFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  children: ReactNode;
  onChange: (value: string) => void;
};


function SelectField({
  id,
  label,
  value,
  required = false,
  disabled = false,
  error,
  children,
  onChange,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
        {required && <span className="text-rose-600"> *</span>}
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
      {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}


type TextAreaFieldProps = {
  id: string;
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
};


function TextAreaField({ id, label, value, rows, onChange }: TextAreaFieldProps) {
  return (
    <div>
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
    </div>
  );
}

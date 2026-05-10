import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { createDocument } from "../../api/documents";
import { DocumentForm } from "../../components/documents/DocumentForm";
import { ErrorState } from "../../components/ui/ErrorState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { WorkflowStepper, type WorkflowStep } from "../../components/ui/WorkflowStepper";
import { useAuth } from "../../context/AuthContext";
import { useDocumentMasterData } from "../../hooks/useDocumentMasterData";
import { AccessDenied } from "../AccessDenied";
import type { DocumentCreatePayload } from "../../types/document";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";


const setupSteps: WorkflowStep[] = [
  { label: "Metadata", status: "current", helperText: "Classify material" },
  { label: "Upload Review File", status: "pending", helperText: "Attach primary asset" },
  { label: "Ready for Review", status: "pending", helperText: "Submit package" },
  { label: "MLR Review", status: "pending", helperText: "Review workflow" },
  { label: "Approved", status: "pending", helperText: "Ready for use" },
];

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


export function CreateDocument() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const masterData = useDocumentMasterData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const canCreateDocument = hasPermission(PERMISSIONS.CREATE_REQUEST);
  const linkedRequestId = searchParams.get("request_id");

  async function handleSubmit(payload: DocumentCreatePayload) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const document = await createDocument(payload);
      navigate(`/library/${document.id}`, {
        state: {
          successMessage: linkedRequestId
            ? `Added review content ${document.document_number}.`
            : `Created ${document.document_number}.`,
        },
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canCreateDocument) {
    return <AccessDenied />;
  }

  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Review Content Setup"
        title="Create Review Document"
        subtitle="Add metadata and classify review content for MLR workflow."
        status="DRAFT"
        statusLabel="Draft Setup"
        secondaryAction={
          <Link to="/library" className={secondaryButtonClass}>
            Back to Content Library
          </Link>
        }
      />

      <WorkflowStepper
        title="Creation Workflow"
        subtitle="Metadata comes first; the document dashboard handles file upload after creation."
        steps={setupSteps}
      />

      {masterData.errorMessage && (
        <ErrorState message={masterData.errorMessage} />
      )}

      <DocumentForm
        mode="create"
        brands={masterData.brands}
        products={masterData.products}
        countries={masterData.countries}
        languages={masterData.languages}
        documentTypes={masterData.documentTypes}
        documentSubtypes={masterData.documentSubtypes}
        channels={masterData.channels}
        audiences={masterData.audiences}
        isLoadingMasterData={masterData.isLoading}
        isSubmitting={isSubmitting}
        submitError={submitError}
        initialRequestId={linkedRequestId}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}

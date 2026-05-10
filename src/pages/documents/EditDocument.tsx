import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getDocument, updateDocument } from "../../api/documents";
import { DocumentForm } from "../../components/documents/DocumentForm";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { useAuth } from "../../context/AuthContext";
import { useDocumentMasterData } from "../../hooks/useDocumentMasterData";
import type {
  DocumentCreatePayload,
  DocumentDetail as DocumentDetailType,
} from "../../types/document";
import { getApiErrorMessage } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";
import { AccessDenied } from "../AccessDenied";


const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


export function EditDocument() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const masterData = useDocumentMasterData();
  const [document, setDocument] = useState<DocumentDetailType | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const numericDocumentId = Number(documentId);
  const isAdmin = hasPermission(PERMISSIONS.MANAGE_SYSTEM);
  const isOwner = Boolean(document && user?.id === document.owner_id);
  const canEdit =
    Boolean(document) &&
    (isAdmin ||
      (isOwner &&
        (document?.status === "DRAFT" || document?.status === "CHANGES_REQUESTED")));

  const fetchDocument = useCallback(async () => {
    if (!Number.isFinite(numericDocumentId)) {
      setErrorMessage("Document not found.");
      setIsLoadingDocument(false);
      return;
    }

    setIsLoadingDocument(true);
    setErrorMessage(null);

    try {
      const nextDocument = await getDocument(numericDocumentId);
      setDocument(nextDocument);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoadingDocument(false);
    }
  }, [numericDocumentId]);

  useEffect(() => {
    void fetchDocument();
  }, [fetchDocument]);

  async function handleSubmit(payload: DocumentCreatePayload) {
    if (!document) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updatedDocument = await updateDocument(document.id, payload);
      navigate(`/library/${updatedDocument.id}`, {
        state: { successMessage: "Document metadata updated." },
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingDocument) {
    return (
      <PageContainer>
        <LoadingState label="Loading document metadata..." rows={4} />
      </PageContainer>
    );
  }

  if (!document) {
    return (
      <PageContainer>
        <ErrorState message={errorMessage || "Document not found."} />
        <Link to="/library" className={secondaryButtonClass}>
          Back to Content Library
        </Link>
      </PageContainer>
    );
  }

  if (!canEdit) {
    return <AccessDenied />;
  }

  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow={document.document_number}
        title="Edit Review Content Metadata"
        subtitle="Update editable metadata fields while preserving content history."
        status={document.status}
        secondaryAction={
          <Link to={`/library/${document.id}`} className={secondaryButtonClass}>
            Back to Detail
          </Link>
        }
      />

      {(errorMessage || masterData.errorMessage) && (
        <ErrorState message={errorMessage || masterData.errorMessage || "Unable to load metadata."} />
      )}

      <DocumentForm
        mode="edit"
        document={document}
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
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}

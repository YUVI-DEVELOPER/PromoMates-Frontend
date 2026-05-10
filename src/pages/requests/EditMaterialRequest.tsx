import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  deleteContentRequestReferenceMaterial,
  getMaterialRequest,
  resubmitAfterRegionalEdits,
  saveMaterialRequestDraft,
  submitMaterialRequest,
  uploadContentRequestReferenceMaterials,
} from "../../api/materialRequests";
import { MaterialRequestForm } from "../../components/requests/MaterialRequestForm";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { useAuth } from "../../context/AuthContext";
import { useMaterialRequestMasterData } from "../../hooks/useMaterialRequestMasterData";
import type {
  MaterialRequest,
  MaterialRequestCreatePayload,
} from "../../types/materialRequest";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";
import { PERMISSIONS } from "../../utils/permissions";
import { AccessDenied } from "../AccessDenied";


const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


const editableStatuses = [
  "DRAFT",
  "RETURNED_TO_SPOC",
  "SPOC_REVISION_IN_PROGRESS",
  "THERAPY_CHANGES_REQUESTED",
  "MARKETING_CHANGES_REQUESTED",
];


export function EditMaterialRequest() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const masterData = useMaterialRequestMasterData();
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [spocResponseNotes, setSpocResponseNotes] = useState("");
  const [spocResponseError, setSpocResponseError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!requestId) {
      setErrorMessage("Content request not found.");
      setIsLoadingRequest(false);
      return;
    }

    setIsLoadingRequest(true);
    setErrorMessage(null);

    try {
      const nextRequest = await getMaterialRequest(requestId);
      setRequest(nextRequest);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoadingRequest(false);
    }
  }, [requestId]);

  useEffect(() => {
    void fetchRequest();
  }, [fetchRequest]);

  async function handleSubmit(
    payload: MaterialRequestCreatePayload,
    options: { action: "draft" | "submit"; pendingReferenceFiles: File[] },
  ) {
    if (!request) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    setSpocResponseError(null);

    const isReturnedRequest = request.status === "RETURNED_TO_SPOC" || request.status === "SPOC_REVISION_IN_PROGRESS";
    const isReturnedResubmit = options.action === "submit" && isReturnedRequest;
    if (isReturnedResubmit && !spocResponseNotes.trim()) {
      setSpocResponseError("SPOC correction response is required before resubmission.");
      setIsSubmitting(false);
      return;
    }

    try {
      let updatedRequest = await saveMaterialRequestDraft(payload, request.id);
      if (options.pendingReferenceFiles.length > 0) {
        const referenceMaterials = await uploadContentRequestReferenceMaterials(
          updatedRequest.id,
          options.pendingReferenceFiles,
        );
        updatedRequest = {
          ...updatedRequest,
          reference_materials: [...(updatedRequest.reference_materials ?? []), ...referenceMaterials],
        };
      }
      if (options.action === "submit") {
        if (isReturnedResubmit) {
          const response = await resubmitAfterRegionalEdits(updatedRequest.id, {
            response_notes: spocResponseNotes.trim(),
            spoc_attachment_ids: [],
          });
          updatedRequest = response.request;
        } else {
          updatedRequest = await submitMaterialRequest(updatedRequest.id);
        }
      }
      navigate(`/requests/${updatedRequest.id}`, {
        state: {
          successMessage:
            options.action === "submit"
              ? "Content request submitted for Regional Marketing Evaluation."
              : "Content request draft updated.",
        },
      });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
      setFieldErrors(getApiFieldErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveReferenceMaterial(materialId: number) {
    if (!request) {
      return;
    }
    const removed = await deleteContentRequestReferenceMaterial(request.id, materialId);
    setRequest((currentRequest) =>
      currentRequest
        ? {
            ...currentRequest,
            reference_materials: (currentRequest.reference_materials ?? []).filter(
              (material) => material.id !== removed.id,
            ),
          }
        : currentRequest,
    );
  }

  if (isLoadingRequest) {
    return (
      <PageContainer>
        <LoadingState label="Loading content request..." rows={4} />
      </PageContainer>
    );
  }

  if (!request) {
    return (
      <PageContainer>
        <ErrorState message={errorMessage || "Content request not found."} />
        <Link to="/requests" className={secondaryButtonClass}>
          Back to Requests
        </Link>
      </PageContainer>
    );
  }

  const isAdmin = hasPermission(PERMISSIONS.MANAGE_SYSTEM);
  const isRequester = user?.id === request.requested_by_id;
  const canEdit = isAdmin || (isRequester && editableStatuses.includes(request.status));

  if (!canEdit) {
    return <AccessDenied />;
  }

  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow={request.request_number ?? "Draft"}
        title="Edit Content Request"
        subtitle="Update request details while the request is still editable."
        status={request.status}
        secondaryAction={
          <Link to={`/requests/${request.id}`} className={secondaryButtonClass}>
            Back to Detail
          </Link>
        }
      />

      {(errorMessage || masterData.errorMessage) && (
        <ErrorState message={errorMessage || masterData.errorMessage || "Unable to load request metadata."} />
      )}

      {(request.status === "RETURNED_TO_SPOC" || request.status === "SPOC_REVISION_IN_PROGRESS") && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <label className="block text-sm font-semibold text-orange-950" htmlFor="edit-spoc-response-notes">
            SPOC Correction Response
          </label>
          <textarea
            id="edit-spoc-response-notes"
            value={spocResponseNotes}
            onChange={(event) => setSpocResponseNotes(event.target.value)}
            rows={4}
            className="mt-2 block min-h-[110px] w-full rounded-md border border-orange-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Summarize what changed before resubmission."
          />
          {spocResponseError && <p className="mt-1 text-xs font-medium text-rose-700">{spocResponseError}</p>}
        </div>
      )}

      <MaterialRequestForm
        mode="edit"
        request={request}
        regions={masterData.regions}
        countries={masterData.countries}
        brands={masterData.brands}
        products={masterData.products}
        therapeuticAreas={masterData.therapeuticAreas}
        subTherapyAreas={masterData.subTherapyAreas}
        campaigns={masterData.campaigns}
        documentTypes={masterData.documentTypes}
        audiences={masterData.audiences}
        channels={masterData.channels}
        isLoadingMasterData={masterData.isLoading}
        isSubmitting={isSubmitting}
        submitError={submitError}
        serverFieldErrors={fieldErrors}
        onSubmit={handleSubmit}
        onRemoveReferenceMaterial={handleRemoveReferenceMaterial}
      />
    </PageContainer>
  );
}

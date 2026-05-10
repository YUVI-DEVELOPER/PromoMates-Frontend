import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  deleteContentRequestFormDraft,
  deleteContentRequestReferenceMaterial,
  flushContentRequestFormDraft,
  getContentRequestFormDraft,
  saveContentRequestFormDraft,
  saveMaterialRequestDraft,
  submitMaterialRequest,
  uploadContentRequestReferenceMaterials,
} from "../../api/materialRequests";
import { MaterialRequestForm } from "../../components/requests/MaterialRequestForm";
import { ErrorState } from "../../components/ui/ErrorState";
import { PageContainer } from "../../components/ui/PageContainer";
import { PageHeroSummary } from "../../components/ui/PageHeroSummary";
import { useMaterialRequestMasterData } from "../../hooks/useMaterialRequestMasterData";
import type { MaterialRequest, MaterialRequestCreatePayload } from "../../types/materialRequest";
import { getApiErrorMessage, getApiFieldErrors } from "../../utils/apiError";


const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100";


type DraftSaveState = "idle" | "loading" | "restored" | "saving" | "saved" | "error";


function draftPayloadSignature(payload: MaterialRequestCreatePayload | null): string {
  return JSON.stringify(payload ?? {});
}


function hasDraftPayloadValues(payload: MaterialRequestCreatePayload | null): boolean {
  if (!payload) {
    return false;
  }

  return Object.values(payload).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== undefined && value !== "";
  });
}


function formatDraftSavedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


export function CreateMaterialRequest() {
  const navigate = useNavigate();
  const masterData = useMaterialRequestMasterData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftRequest, setDraftRequest] = useState<MaterialRequest | null>(null);
  const [initialDraftPayload, setInitialDraftPayload] = useState<MaterialRequestCreatePayload | null>(null);
  const [pendingDraftPayload, setPendingDraftPayload] = useState<MaterialRequestCreatePayload | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("loading");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [savedDraftSignature, setSavedDraftSignature] = useState(draftPayloadSignature(null));
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const latestDraftRef = useRef<{
    isLoaded: boolean;
    payload: MaterialRequestCreatePayload | null;
    savedSignature: string;
  }>({
    isLoaded: false,
    payload: null,
    savedSignature: draftPayloadSignature(null),
  });

  useEffect(() => {
    let isMounted = true;

    async function loadFormDraft() {
      try {
        const draft = await getContentRequestFormDraft();
        if (!isMounted) {
          return;
        }
        const payload = draft?.payload ?? null;
        const signature = draftPayloadSignature(payload);
        setInitialDraftPayload(payload);
        setPendingDraftPayload(payload);
        setSavedDraftSignature(signature);
        setDraftUpdatedAt(draft?.updated_at ?? null);
        setDraftSaveState(draft ? "restored" : "idle");
      } catch {
        if (isMounted) {
          setDraftSaveState("error");
        }
      } finally {
        if (isMounted) {
          setHasLoadedDraft(true);
        }
      }
    }

    void loadFormDraft();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    latestDraftRef.current = {
      isLoaded: hasLoadedDraft,
      payload: pendingDraftPayload,
      savedSignature: savedDraftSignature,
    };
  }, [hasLoadedDraft, pendingDraftPayload, savedDraftSignature]);

  useEffect(() => {
    if (!hasLoadedDraft || isSubmitting || draftRequest || pendingDraftPayload === null) {
      return;
    }

    const signature = draftPayloadSignature(pendingDraftPayload);
    if (signature === savedDraftSignature) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        if (hasDraftPayloadValues(pendingDraftPayload)) {
          setDraftSaveState("saving");
          const savedDraft = await saveContentRequestFormDraft(pendingDraftPayload);
          setSavedDraftSignature(signature);
          setDraftUpdatedAt(savedDraft.updated_at);
          setDraftSaveState("saved");
          return;
        }

        await deleteContentRequestFormDraft();
        setSavedDraftSignature(signature);
        setDraftUpdatedAt(null);
        setDraftSaveState("idle");
      } catch {
        setDraftSaveState("error");
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftRequest, hasLoadedDraft, isSubmitting, pendingDraftPayload, savedDraftSignature]);

  useEffect(() => {
    function flushLatestDraft() {
      const { isLoaded, payload, savedSignature } = latestDraftRef.current;
      if (!isLoaded || payload === null || !hasDraftPayloadValues(payload)) {
        return;
      }
      if (draftPayloadSignature(payload) === savedSignature) {
        return;
      }
      flushContentRequestFormDraft(payload);
    }

    window.addEventListener("beforeunload", flushLatestDraft);

    return () => {
      flushLatestDraft();
      window.removeEventListener("beforeunload", flushLatestDraft);
    };
  }, []);

  const handleDraftChange = useCallback((payload: MaterialRequestCreatePayload) => {
    setPendingDraftPayload(payload);
  }, []);

  async function clearTemporaryFormDraft() {
    await deleteContentRequestFormDraft();
    latestDraftRef.current = {
      isLoaded: true,
      payload: null,
      savedSignature: draftPayloadSignature(null),
    };
    setInitialDraftPayload(null);
    setPendingDraftPayload(null);
    setSavedDraftSignature(draftPayloadSignature(null));
    setDraftUpdatedAt(null);
    setDraftSaveState("idle");
  }

  async function handleSaveTemporaryDraft(
    payload: MaterialRequestCreatePayload,
    options: { pendingReferenceFiles: File[] },
  ) {
    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      setDraftSaveState("saving");
      let request = await saveMaterialRequestDraft(payload, draftRequest?.id);
      if (options.pendingReferenceFiles.length > 0) {
        const referenceMaterials = await uploadContentRequestReferenceMaterials(
          request.id,
          options.pendingReferenceFiles,
        );
        request = {
          ...request,
          reference_materials: [...(request.reference_materials ?? []), ...referenceMaterials],
        };
      }
      setDraftRequest(request);
      await clearTemporaryFormDraft();
      navigate(`/requests/${request.id}`, {
        state: { successMessage: "Draft saved" },
      });
    } catch (error) {
      setDraftSaveState("error");
      setSubmitError(getApiErrorMessage(error));
      setFieldErrors(getApiFieldErrors(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(
    payload: MaterialRequestCreatePayload,
    options: { action: "draft" | "submit"; pendingReferenceFiles: File[] },
  ) {
    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      let request = await saveMaterialRequestDraft(payload, draftRequest?.id);
      setDraftRequest(request);
      if (options.pendingReferenceFiles.length > 0) {
        const referenceMaterials = await uploadContentRequestReferenceMaterials(
          request.id,
          options.pendingReferenceFiles,
        );
        request = {
          ...request,
          reference_materials: [...(request.reference_materials ?? []), ...referenceMaterials],
        };
        setDraftRequest(request);
      }
      if (options.action === "submit") {
        request = await submitMaterialRequest(request.id);
      }
      try {
        await clearTemporaryFormDraft();
      } catch {
        setDraftSaveState("error");
      }
      navigate(`/requests/${request.id}`, {
        state: {
          successMessage:
            options.action === "submit"
              ? "Content request submitted for Regional Marketing Evaluation."
              : "Draft saved",
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
    if (!draftRequest) {
      return;
    }
    const removed = await deleteContentRequestReferenceMaterial(draftRequest.id, materialId);
    setDraftRequest((currentRequest) =>
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

  const draftSavedAtLabel = formatDraftSavedAt(draftUpdatedAt);
  const draftStatusMessage =
    draftSaveState === "loading"
      ? "Checking for saved draft..."
      : draftSaveState === "restored" && draftSavedAtLabel
        ? `Draft restored from ${draftSavedAtLabel}.`
        : draftSaveState === "saving"
          ? "Saving draft..."
          : draftSaveState === "saved" && draftSavedAtLabel
            ? `Draft saved ${draftSavedAtLabel}.`
            : draftSaveState === "error"
              ? "Draft autosave is unavailable. You can still submit the form."
              : null;

  return (
    <PageContainer>
      <PageHeroSummary
        eyebrow="Request Intake"
        title="New Content Request"
        subtitle="Capture the regional intake details for content planning."
        status="DRAFT"
        statusLabel="Draft Request"
        secondaryAction={
          <Link to="/requests" className={secondaryButtonClass}>
            Back to Requests
          </Link>
        }
      />

      {masterData.errorMessage && (
        <ErrorState message={masterData.errorMessage} />
      )}

      {draftStatusMessage && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
          {draftStatusMessage}
        </div>
      )}

      <MaterialRequestForm
        mode="create"
        request={draftRequest ?? undefined}
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
        isLoadingMasterData={masterData.isLoading || !hasLoadedDraft}
        isSubmitting={isSubmitting}
        submitError={submitError}
        serverFieldErrors={fieldErrors}
        initialDraftPayload={initialDraftPayload}
        onDraftChange={handleDraftChange}
        onSaveDraft={handleSaveTemporaryDraft}
        onSubmit={handleSubmit}
        onRemoveReferenceMaterial={handleRemoveReferenceMaterial}
      />
    </PageContainer>
  );
}

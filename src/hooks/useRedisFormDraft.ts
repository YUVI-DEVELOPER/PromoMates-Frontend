import { useCallback, useState } from "react";

import {
  deleteFormDraft,
  getFormDraft,
  saveFormDraft,
  type FormDraft,
} from "../api/formDrafts";


export type RedisFormDraftState = "idle" | "loading" | "restored" | "saving" | "saved" | "error";


type UseRedisFormDraftResult<TPayload extends object> = {
  draftState: RedisFormDraftState;
  draftUpdatedAt: string | null;
  draftExpiresAt: string | null;
  draftError: string | null;
  loadDraft: () => Promise<FormDraft<TPayload> | null>;
  saveDraft: (payload: TPayload) => Promise<FormDraft<TPayload> | null>;
  clearDraft: () => Promise<void>;
  resetDraftState: () => void;
};


export function useRedisFormDraft<TPayload extends object>(
  formKey: string | null,
): UseRedisFormDraftResult<TPayload> {
  const [draftState, setDraftState] = useState<RedisFormDraftState>("idle");
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [draftExpiresAt, setDraftExpiresAt] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const resetDraftState = useCallback(() => {
    setDraftState("idle");
    setDraftUpdatedAt(null);
    setDraftExpiresAt(null);
    setDraftError(null);
  }, []);

  const loadDraft = useCallback(async () => {
    if (!formKey) {
      resetDraftState();
      return null;
    }

    setDraftState("loading");
    setDraftError(null);

    try {
      const draft = await getFormDraft<TPayload>(formKey);
      if (!draft) {
        resetDraftState();
        return null;
      }

      setDraftState("restored");
      setDraftUpdatedAt(draft.updated_at);
      setDraftExpiresAt(draft.expires_at);
      return draft;
    } catch {
      setDraftState("error");
      setDraftError("Draft storage is unavailable.");
      return null;
    }
  }, [formKey, resetDraftState]);

  const saveDraft = useCallback(async (payload: TPayload) => {
    if (!formKey) {
      return null;
    }

    setDraftState("saving");
    setDraftError(null);

    try {
      const draft = await saveFormDraft(formKey, payload);
      setDraftState("saved");
      setDraftUpdatedAt(draft.updated_at);
      setDraftExpiresAt(draft.expires_at);
      return draft;
    } catch {
      setDraftState("error");
      setDraftError("Draft could not be saved.");
      return null;
    }
  }, [formKey]);

  const clearDraft = useCallback(async () => {
    if (!formKey) {
      resetDraftState();
      return;
    }

    try {
      await deleteFormDraft(formKey);
    } finally {
      resetDraftState();
    }
  }, [formKey, resetDraftState]);

  return {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  };
}


export function formatDraftTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

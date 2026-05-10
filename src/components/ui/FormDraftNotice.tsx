import { formatDraftTimestamp, type RedisFormDraftState } from "../../hooks/useRedisFormDraft";


type FormDraftNoticeProps = {
  state: RedisFormDraftState;
  updatedAt: string | null;
  expiresAt?: string | null;
  error?: string | null;
};


export function FormDraftNotice({ state, updatedAt, expiresAt, error }: FormDraftNoticeProps) {
  const updatedLabel = formatDraftTimestamp(updatedAt);
  const expiresLabel = formatDraftTimestamp(expiresAt ?? null);

  const message =
    state === "loading"
      ? "Checking for saved draft..."
      : state === "restored" && updatedLabel
        ? `Draft restored from ${updatedLabel}${expiresLabel ? `, available until ${expiresLabel}` : ""}.`
        : state === "saving"
          ? "Saving draft..."
          : state === "saved" && updatedLabel
            ? `Draft saved ${updatedLabel}${expiresLabel ? `, available until ${expiresLabel}` : ""}.`
            : state === "error"
              ? error ?? "Draft storage is unavailable."
              : null;

  if (!message) {
    return null;
  }

  const toneClass = state === "error"
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm font-medium ${toneClass}`}>
      {message}
    </div>
  );
}

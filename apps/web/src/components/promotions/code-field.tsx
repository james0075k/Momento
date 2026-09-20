"use client";

import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

const field =
  "border-input bg-surface focus-visible:outline-ring min-h-11 w-full rounded-md border px-3 focus-visible:outline-2";

/**
 * One code box for referral codes and gift cards: type a code, check it with the API, and show the
 * result. The parent keeps the checked value and sends it with the order (the server checks it again).
 */
export function CodeField<T extends { code: string }>({
  id,
  title,
  hint,
  placeholder,
  path,
  applied,
  describe,
  onApply,
  onRemove,
}: {
  id: string;
  title: string;
  hint: string;
  placeholder: string;
  /** API path that checks a code, e.g. "/gift-cards/balance". It takes `{ code }`. */
  path: string;
  applied: T | null;
  /** The sentence shown once a code is applied. */
  describe: (value: T) => string;
  onApply: (value: T) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const check = async () => {
    const code = text.trim();
    if (!code) return;
    setBusy(true);
    setError(undefined);
    try {
      onApply(await apiRequest<T>(path, { body: { code } }));
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code could not be checked.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3">
      <h2 id={`${id}-title`} className="text-2xl font-semibold">
        {title}
      </h2>
      {applied ? (
        <div className="bg-surface border-success/40 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <span>
            <strong>{applied.code}</strong> {describe(applied)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-brand focus-visible:outline-ring min-h-11 px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{hint}</p>
          <div className="flex gap-2">
            <label htmlFor={id} className="sr-only">
              {title}
            </label>
            <input
              id={id}
              value={text}
              onChange={(event) => setText(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void check();
                }
              }}
              maxLength={24}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder={placeholder}
              className={cn(field, "flex-1")}
            />
            <button
              type="button"
              onClick={() => void check()}
              disabled={busy || !text.trim()}
              className="border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            >
              {busy ? "Checking" : "Apply"}
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-brand text-sm">
          {error}
        </p>
      )}
    </section>
  );
}

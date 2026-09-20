"use client";

import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { formatNpr } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Check a gift card balance with its code. Codes are only ever answered one at a time (rate limited). */
export function GiftCardChecker() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ code: string; balance: number } | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const check = async () => {
    const code = text.trim();
    if (!code) return;
    setBusy(true);
    setError(undefined);
    setResult(null);
    try {
      setResult(
        await apiRequest<{ code: string; balance: number }>("/gift-cards/balance", {
          body: { code },
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check that card.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void check();
      }}
      className="max-w-md space-y-3"
    >
      <label htmlFor="gc-code" className="block font-medium">
        Gift card code
      </label>
      <div className="flex gap-2">
        <input
          id="gc-code"
          value={text}
          onChange={(event) => setText(event.target.value.toUpperCase())}
          maxLength={24}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="GC-XXXX-XXXX"
          className={cn(
            "border-input bg-surface focus-visible:outline-ring min-h-11 flex-1 rounded-md border px-3 focus-visible:outline-2",
          )}
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-5 font-medium focus-visible:outline-2 disabled:opacity-50"
        >
          {busy ? "Checking" : "Check balance"}
        </button>
      </div>
      <div aria-live="polite">
        {result && (
          <p className="bg-surface rounded-xl px-4 py-3">
            <strong>{result.code}</strong> has <strong>{formatNpr(result.balance)}</strong> left.
          </p>
        )}
        {error && <p className="text-brand">{error}</p>}
      </div>
    </form>
  );
}

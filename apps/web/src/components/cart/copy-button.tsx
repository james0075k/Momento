"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies a value (order code, account number) and says so. Works without clipboard access by staying quiet. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {});
      }}
      aria-label={`Copy ${label}`}
      className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium focus-visible:outline-2"
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

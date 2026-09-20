"use client";

import { Minus, Plus } from "lucide-react";
import { MAX_LINE_QUANTITY } from "@/lib/cart";

const button =
  "focus-visible:outline-ring inline-flex size-11 items-center justify-center hover:bg-muted focus-visible:outline-2 disabled:opacity-40";

export function QuantityStepper({
  value,
  onChange,
  label = "Quantity",
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-input bg-surface inline-flex items-center rounded-md border"
    >
      <button
        type="button"
        className={button}
        aria-label="One fewer"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <span className="min-w-10 text-center font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        aria-label="One more"
        disabled={value >= MAX_LINE_QUANTITY}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}

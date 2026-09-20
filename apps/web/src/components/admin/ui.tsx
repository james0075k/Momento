import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared look for text inputs across the admin. 44px tall for touch. */
export const inputClass =
  "border-input bg-surface focus-visible:outline-ring min-h-11 w-full rounded-md border px-3 focus-visible:outline-2";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 max-w-prose">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-surface rounded-2xl p-5", className)}>
      {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/** One big number with a label. */
export function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface rounded-2xl p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="text-muted-foreground mt-1 text-sm">{note}</p>}
    </div>
  );
}

const BADGE = {
  neutral: "bg-muted text-ink",
  success: "bg-success text-surface",
  danger: "bg-brand text-surface",
  // Marigold is never used with white text: ink on accent, as the brand rules say.
  warning: "bg-accent text-ink",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        BADGE[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" className="text-muted-foreground py-6">
      {label}
    </p>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="bg-brand/10 text-brand rounded-xl px-4 py-3 font-medium">
      {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-visible:outline-ring ml-3 min-h-11 underline underline-offset-4 focus-visible:outline-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** A labelled form control, with its error under it. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-muted-foreground mt-1 text-sm">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-brand mt-1 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

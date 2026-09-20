"use client";

import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./ui";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, "bg-surface", className)} />;
}

/** An on/off switch that a screen reader announces as a switch. */
export function Switch({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "focus-visible:outline-ring relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          checked ? "bg-success" : "bg-ink/25",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "bg-surface absolute left-0.5 top-0.5 size-6 rounded-full transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer font-medium">
        {label}
      </label>
    </div>
  );
}

/**
 * A dialog on top of the page (the browser's own <dialog>, so Escape and focus trapping just work).
 * Its content exists only while it is open, so a form inside starts fresh each time.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="bg-paper text-ink backdrop:bg-ink/50 m-auto max-h-[92vh] w-[min(42rem,94vw)] overflow-y-auto rounded-2xl p-0"
    >
      {open && (
        <div className="p-5 md:p-6">
          <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** A button that asks "are you sure?" before doing something that cannot be undone. */
export function ConfirmButton({
  label,
  title,
  message,
  confirmLabel,
  onConfirm,
  className,
}: {
  label: string;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-brand focus-visible:outline-ring inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4 focus-visible:outline-2",
          className,
        )}
      >
        {label}
      </button>
      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <p className="text-muted-foreground">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border-input bg-surface focus-visible:outline-ring min-h-11 rounded-md border px-5 font-medium focus-visible:outline-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
            className="bg-brand text-surface focus-visible:outline-ring min-h-11 rounded-md px-5 font-medium focus-visible:outline-2"
          >
            {confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}

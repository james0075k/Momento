import type { OrderStatus } from "@momento/shared";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: Array<{ status: OrderStatus; label: string; detail: string }> = [
  { status: "pending_payment", label: "Order placed", detail: "Waiting for your payment" },
  { status: "paid", label: "Payment received", detail: "We have your payment" },
  { status: "printing", label: "Printing", detail: "Your order is being made" },
  { status: "shipped", label: "On the way", detail: "Out for delivery" },
  { status: "delivered", label: "Delivered", detail: "Enjoy your keepsake" },
];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

interface OrderTimelineProps {
  status: OrderStatus;
  history: Array<{ status: OrderStatus; at: string }>;
}

/** Where the order is now, with the time of each step reached. Shows status only, nothing personal. */
export function OrderTimeline({ status, history }: OrderTimelineProps) {
  const at = new Map(history.map((entry) => [entry.status, entry.at]));
  const reached = STEPS.findIndex((step) => step.status === status);
  const cancelled = status === "cancelled";

  const steps = cancelled
    ? [
        ...STEPS.filter((step) => at.has(step.status)),
        { status: "cancelled" as const, label: "Cancelled", detail: "This order was cancelled" },
      ]
    : STEPS;

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const done = cancelled ? true : index <= reached;
        const current = cancelled ? step.status === "cancelled" : index === reached;
        const time = at.get(step.status);
        return (
          <li key={step.status} className="relative flex gap-4 pb-7 last:pb-0">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5",
                  done && !current ? "bg-success" : "bg-ink/15",
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                step.status === "cancelled" && "border-brand bg-brand text-surface",
                step.status !== "cancelled" && done && "border-success bg-success text-surface",
                !done && "border-ink/20 bg-surface",
              )}
            >
              {done && <Check className="size-4" />}
            </span>
            <div className="pt-0.5">
              <p className={cn("font-semibold", !done && "text-muted-foreground")}>
                {step.label}
                {current && <span className="sr-only"> (current step)</span>}
              </p>
              <p className="text-muted-foreground text-sm">{time ? when(time) : step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

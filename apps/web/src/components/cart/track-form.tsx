"use client";

import { trackOrderInputSchema } from "@momento/shared";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { formatNpr } from "@/lib/format";
import type { TrackedOrder } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { ReferralCard } from "@/components/promotions/referral-card";
import { OrderAgainButton } from "./order-again-button";
import { OrderTimeline } from "./order-timeline";
import { OrderTotals } from "./order-totals";

const field =
  "border-input bg-surface focus-visible:outline-ring min-h-11 w-full rounded-md border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2";

/** Looks an order up by code and phone. Both must match; the answer never says which one was wrong. */
export function TrackForm({ initialCode = "" }: { initialCode?: string }) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = trackOrderInputSchema.safeParse({
      code: String(data.get("code") ?? ""),
      phone: String(data.get("phone") ?? ""),
    });
    if (!parsed.success) {
      setError("Enter your order code (like MOM-2026-0001) and the phone number you ordered with.");
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      setOrder(await apiRequest<TrackedOrder>("/orders/track", { body: parsed.data }));
    } catch (failure) {
      setOrder(null);
      setError(
        failure instanceof ApiError && failure.status === 404
          ? "We could not find an order with that code and phone. Check both and try again."
          : failure instanceof ApiError
            ? failure.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[24rem_1fr] lg:gap-12">
      <form onSubmit={onSubmit} noValidate className="bg-surface h-fit space-y-4 rounded-2xl p-5">
        <div>
          <label htmlFor="track-code" className="mb-1 block font-medium">
            Order code
          </label>
          <input
            id="track-code"
            name="code"
            defaultValue={initialCode}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="MOM-2026-0001"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="track-phone" className="mb-1 block font-medium">
            Phone number
          </label>
          <input
            id="track-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={field}
          />
        </div>
        {error && (
          <p role="alert" className="text-brand text-sm">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy} className="h-12 w-full">
          {busy ? "Looking" : "Track order"}
        </Button>
      </form>

      {order && (
        <section aria-labelledby="track-result" className="space-y-6" aria-live="polite">
          <div>
            <h2 id="track-result" className="text-2xl font-semibold">
              Order {order.code}
            </h2>
            <p
              className={cn(
                "mt-1 font-medium",
                order.status === "cancelled" ? "text-brand" : "text-success",
              )}
            >
              {STATUS_TEXT[order.status]}
            </p>
          </div>
          <div className="bg-surface rounded-2xl p-5">
            <OrderTimeline status={order.status} history={order.statusHistory} />
          </div>
          <div className="bg-surface rounded-2xl p-5">
            <h3 className="text-lg font-semibold">Items</h3>
            <ul className="mt-3 space-y-2">
              {order.items.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex justify-between gap-4">
                  <span>
                    {item.quantity} x {item.title}
                    {item.variantLabel && (
                      <span className="text-muted-foreground block text-sm">
                        {item.variantLabel}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatNpr(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals
              className="border-ink/10 mt-4 border-t pt-4"
              subtotal={order.subtotal}
              discount={order.discount}
              referralDiscount={order.referralDiscount}
              giftCardApplied={order.giftCardApplied}
              deliveryFee={order.deliveryFee}
              total={order.total}
            />
          </div>
          {order.referral && <ReferralCard referral={order.referral} />}
          {order.items.length > 0 && <OrderAgainButton items={order.items} />}
        </section>
      )}
    </div>
  );
}

const STATUS_TEXT: Record<TrackedOrder["status"], string> = {
  pending_payment: "Waiting for payment",
  paid: "Payment received",
  printing: "Being printed",
  shipped: "On the way to you",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

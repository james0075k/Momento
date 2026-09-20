"use client";

import type { Settings } from "@momento/shared";
import { ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PhotoScene } from "@/components/home/scenes";
import { buttonVariants } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { lineKey } from "@/lib/cart";
import { formatNpr } from "@/lib/format";
import { useLiveCart } from "@/lib/use-live-cart";
import { cn } from "@/lib/utils";

function deliveryNote(fees: Settings["deliveryFees"]): string {
  const base = `Delivery is ${formatNpr(fees.insideValley)} inside Kathmandu Valley and ${formatNpr(fees.outsideValley)} outside.`;
  return fees.freeDeliveryThreshold !== undefined
    ? `${base} Free on orders of ${formatNpr(fees.freeDeliveryThreshold)} or more.`
    : base;
}

export function CartView({ deliveryFees }: { deliveryFees: Settings["deliveryFees"] }) {
  const cart = useLiveCart();

  if (!cart.hydrated) {
    return <div aria-hidden className="bg-muted h-64 animate-pulse rounded-2xl" />;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="border-ink/15 rounded-2xl border border-dashed px-6 py-16 text-center">
        <ShoppingBag aria-hidden className="text-muted-foreground mx-auto size-10" />
        <h2 className="mt-4 text-2xl font-semibold">Your cart is empty</h2>
        <p className="text-muted-foreground mt-2">Pick a photo book, frame or print to start.</p>
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-12")}>
          Browse the shop
        </Link>
      </div>
    );
  }

  const blocked = cart.unavailable.length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
      <div>
        {cart.freshness === "offline" && (
          <p role="status" className="bg-accent/25 mb-4 rounded-xl px-4 py-3 text-sm">
            We could not refresh prices just now. The final price is confirmed when you place the
            order.
          </p>
        )}
        {cart.changed.length > 0 && (
          <p role="status" className="bg-accent/25 mb-4 rounded-xl px-4 py-3 text-sm">
            Some prices changed since you added them. The prices below are up to date.
          </p>
        )}

        <ul className="space-y-4">
          {cart.lines.map((line) => {
            const key = lineKey(line);
            const gone = cart.unavailable.includes(key);
            return (
              <li key={key} className="bg-surface flex gap-4 rounded-2xl p-4">
                <Link
                  href={`/shop/${line.slug}`}
                  className="bg-tint relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24"
                  aria-label={`View ${line.title}`}
                >
                  {line.image ? (
                    <Image src={line.image} alt="" fill sizes="6rem" className="object-cover" />
                  ) : (
                    <PhotoScene scene="himal" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/shop/${line.slug}`}
                    className="focus-visible:outline-ring block font-semibold leading-snug hover:underline focus-visible:outline-2"
                  >
                    {line.title}
                  </Link>
                  {line.variantLabel && (
                    <p className="text-muted-foreground text-sm">{line.variantLabel}</p>
                  )}
                  {gone ? (
                    <p role="alert" className="text-brand mt-2 text-sm font-medium">
                      No longer available. Remove it to continue.
                    </p>
                  ) : (
                    <p className="mt-1 tabular-nums">{formatNpr(line.unitPrice)}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    {!gone && (
                      <QuantityStepper
                        label={`Quantity of ${line.title}`}
                        value={line.quantity}
                        onChange={(quantity) => cart.setQuantity(key, quantity)}
                      />
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {!gone && (
                        <span className="font-semibold tabular-nums">
                          {formatNpr(line.unitPrice * line.quantity)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => cart.remove(key)}
                        aria-label={`Remove ${line.title}`}
                        className="focus-visible:outline-ring text-muted-foreground hover:text-brand inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2"
                      >
                        <Trash2 aria-hidden className="size-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside
        aria-label="Order summary"
        className="lg:sticky lg:top-[calc(6rem+var(--banner-h,0px))] lg:self-start"
      >
        <div className="bg-surface rounded-2xl p-5">
          <div className="flex justify-between gap-4 text-lg font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatNpr(cart.availableSubtotal)}</span>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">{deliveryNote(deliveryFees)}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Coupons and delivery are added at checkout.
          </p>
          {blocked ? (
            <button
              type="button"
              disabled
              className={cn(buttonVariants({ size: "lg" }), "mt-5 h-12 w-full")}
            >
              Remove unavailable items to continue
            </button>
          ) : (
            <Link
              href="/checkout"
              className={cn(buttonVariants({ size: "lg" }), "mt-5 h-12 w-full")}
            >
              Checkout
            </Link>
          )}
          <Link
            href="/shop"
            className="text-brand focus-visible:outline-ring mt-2 flex min-h-11 items-center justify-center font-medium underline underline-offset-4 focus-visible:outline-2"
          >
            Keep shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}

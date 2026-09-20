import { formatNpr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OrderTotalsProps {
  subtotal: number;
  discount?: number;
  referralDiscount?: number;
  giftCardApplied?: number;
  deliveryFee?: number;
  total: number;
  couponCode?: string;
  /** Set on the checkout preview, where the server's figure is still to come. */
  estimate?: boolean;
  className?: string;
}

/** Subtotal, discount, delivery and total. Used for the preview and for the placed order. */
export function OrderTotals({
  subtotal,
  discount = 0,
  referralDiscount = 0,
  giftCardApplied = 0,
  deliveryFee,
  total,
  couponCode,
  estimate,
  className,
}: OrderTotalsProps) {
  return (
    <dl className={cn("space-y-2", className)}>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Items</dt>
        <dd className="tabular-nums">{formatNpr(subtotal)}</dd>
      </div>
      {discount > 0 && (
        <div className="text-success flex justify-between gap-4">
          <dt>Coupon{couponCode ? ` ${couponCode}` : ""}</dt>
          <dd className="tabular-nums">-{formatNpr(discount)}</dd>
        </div>
      )}
      {referralDiscount > 0 && (
        <div className="text-success flex justify-between gap-4">
          <dt>Referral discount</dt>
          <dd className="tabular-nums">-{formatNpr(referralDiscount)}</dd>
        </div>
      )}
      {deliveryFee !== undefined && (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="tabular-nums">{deliveryFee === 0 ? "Free" : formatNpr(deliveryFee)}</dd>
        </div>
      )}
      {giftCardApplied > 0 && (
        <div className="text-success flex justify-between gap-4">
          <dt>Gift card</dt>
          <dd className="tabular-nums">-{formatNpr(giftCardApplied)}</dd>
        </div>
      )}
      <div className="border-ink/15 flex justify-between gap-4 border-t pt-3 text-lg font-semibold">
        <dt>{estimate ? "Estimated total" : "Total"}</dt>
        <dd className="tabular-nums">{formatNpr(total)}</dd>
      </div>
    </dl>
  );
}

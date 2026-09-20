import type { DeliveryArea, Settings } from "@momento/shared";

/** Mirrors the API's delivery rule. The server's answer is final; this only previews it. */
export function deliveryFeeFor(
  area: DeliveryArea,
  subtotal: number,
  fees: Settings["deliveryFees"],
): number {
  if (fees.freeDeliveryThreshold !== undefined && subtotal >= fees.freeDeliveryThreshold) return 0;
  return area === "inside_valley" ? fees.insideValley : fees.outsideValley;
}

export interface EstimatedTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export function estimateTotals(
  subtotal: number,
  area: DeliveryArea,
  fees: Settings["deliveryFees"],
  discount = 0,
): EstimatedTotals {
  const capped = Math.min(discount, subtotal);
  // Empty carts pay no delivery.
  const deliveryFee = subtotal > 0 ? deliveryFeeFor(area, subtotal, fees) : 0;
  return { subtotal, discount: capped, deliveryFee, total: subtotal - capped + deliveryFee };
}

export interface PromoEstimate extends EstimatedTotals {
  referralDiscount: number;
  giftCardApplied: number;
}

/**
 * The same order of use as the API: coupon, then referral (both off the items), then delivery, then the
 * gift card pays what is left up to its balance. A preview only; the server recomputes everything.
 */
export function estimateWithPromos(
  subtotal: number,
  area: DeliveryArea,
  fees: Settings["deliveryFees"],
  promo: { couponDiscount?: number; referralDiscount?: number; giftCardBalance?: number } = {},
): PromoEstimate {
  const base = estimateTotals(subtotal, area, fees, promo.couponDiscount ?? 0);
  const referralDiscount = Math.min(promo.referralDiscount ?? 0, subtotal - base.discount);
  const owed = subtotal - base.discount - referralDiscount + base.deliveryFee;
  const giftCardApplied = Math.min(promo.giftCardBalance ?? 0, owed);
  return { ...base, referralDiscount, giftCardApplied, total: owed - giftCardApplied };
}

import type { CreateOrderInput, DeliveryArea, Settings } from "@momento/shared";
import { HttpError } from "../middleware/errorHandler";

export interface PricingVariant {
  id: string;
  size: string;
  cover?: string | null;
  pages?: number | null;
  price: number;
}

export interface PricingProduct {
  id: string;
  title: string;
  image?: string;
  basePrice: number;
  isActive: boolean;
  variants: PricingVariant[];
}

export interface PricingCoupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrderAmount?: number | null;
  expiresAt?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
}

export interface PricedLine {
  productId: string;
  variantId?: string;
  title: string;
  image?: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderTotals {
  lines: PricedLine[];
  subtotal: number;
  deliveryFee: number;
  /** Coupon discount. */
  discount: number;
  /** Referral discount (flag `referrals`), 0 otherwise. */
  referralDiscount: number;
  /** Paid from a gift card (flag `giftCards`), 0 otherwise. */
  giftCardApplied: number;
  total: number;
}

export interface PromoInputs {
  /** Fixed amount a valid referral code takes off. It never takes the items below zero. */
  referralDiscount?: number;
  /** Balance of the gift card being used. It pays items and delivery, never more than is owed. */
  giftCardBalance?: number;
}

function variantLabel(variant: PricingVariant): string {
  return [variant.size, variant.cover, variant.pages ? `${variant.pages} pages` : undefined]
    .filter(Boolean)
    .join(", ");
}

export function deliveryFeeFor(area: DeliveryArea, subtotal: number, settings: Settings): number {
  const { freeDeliveryThreshold, insideValley, outsideValley } = settings.deliveryFees;
  if (freeDeliveryThreshold !== undefined && subtotal >= freeDeliveryThreshold) return 0;
  return area === "inside_valley" ? insideValley : outsideValley;
}

/** Throws HttpError(400) when the coupon cannot be used for this subtotal. Returns the discount. */
export function couponDiscount(coupon: PricingCoupon, subtotal: number, now = new Date()): number {
  if (!coupon.isActive) throw new HttpError(400, "Coupon is not active");
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    throw new HttpError(400, "Coupon has expired");
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new HttpError(400, "Coupon usage limit reached");
  }
  if (coupon.minOrderAmount != null && subtotal < coupon.minOrderAmount) {
    throw new HttpError(400, `Coupon needs a minimum order of NPR ${coupon.minOrderAmount}`);
  }
  const raw =
    coupon.type === "percent" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  return Math.min(raw, subtotal);
}

/**
 * Recomputes every price from the database. Nothing price-related is read from the client:
 * the input carries only product ids, variant ids and quantities.
 */
export function computeOrderTotals(
  input: Pick<CreateOrderInput, "items" | "customer">,
  products: Map<string, PricingProduct>,
  settings: Settings,
  coupon?: PricingCoupon,
  now = new Date(),
  promo: PromoInputs = {},
): OrderTotals {
  const lines: PricedLine[] = input.items.map((item) => {
    const product = products.get(item.productId);
    if (!product || !product.isActive) {
      throw new HttpError(400, "A product in your cart is no longer available");
    }

    let unitPrice = product.basePrice;
    let variant: PricingVariant | undefined;
    if (product.variants.length > 0) {
      if (!item.variantId) throw new HttpError(400, `Choose a variant for "${product.title}"`);
      variant = product.variants.find((candidate) => candidate.id === item.variantId);
      if (!variant) throw new HttpError(400, `Unknown variant for "${product.title}"`);
      unitPrice = variant.price;
    } else if (item.variantId) {
      throw new HttpError(400, `"${product.title}" has no variants`);
    }

    return {
      productId: product.id,
      variantId: variant?.id,
      title: product.title,
      image: product.image,
      variantLabel: variant ? variantLabel(variant) : undefined,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = coupon ? couponDiscount(coupon, subtotal, now) : 0;
  // Order of use: coupon, then referral (both off the items), then delivery is added, then the gift
  // card pays whatever is left, up to its balance.
  const referralDiscount = Math.min(promo.referralDiscount ?? 0, subtotal - discount);
  const deliveryFee = deliveryFeeFor(input.customer.area, subtotal, settings);
  const owed = subtotal - discount - referralDiscount + deliveryFee;
  const giftCardApplied = Math.min(promo.giftCardBalance ?? 0, owed);
  return {
    lines,
    subtotal,
    deliveryFee,
    discount,
    referralDiscount,
    giftCardApplied,
    total: owed - giftCardApplied,
  };
}

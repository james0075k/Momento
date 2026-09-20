import type { OrderStatus } from "@momento/shared";

/** What `POST /orders/track` returns: status and money only, never a name, phone or address. */
export interface TrackedOrder {
  code: string;
  status: OrderStatus;
  items: Array<{
    productId: string;
    variantId?: string;
    title: string;
    variantLabel?: string;
    quantity: number;
    lineTotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  /** Zero unless the referral or gift card features were used. */
  referralDiscount: number;
  giftCardApplied: number;
  total: number;
  statusHistory: Array<{ status: OrderStatus; at: string }>;
  createdAt: string;
  /** Present with the `referrals` flag on, once the customer has a code. */
  referral?: {
    code: string;
    friendDiscount: number;
    rewards: Array<{ code: string; value: number }>;
  };
}

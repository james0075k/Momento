import { z } from "zod";
import {
  imageUrlSchema,
  objectIdSchema,
  paginationQuerySchema,
  phoneSchema,
  priceSchema,
} from "./common";
import { couponCodeSchema } from "./coupon";
import { giftCardCodeSchema, referralCodeSchema } from "./promotions";

export const orderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "printing",
  "shipped",
  "delivered",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Allowed next statuses for each status. delivered and cancelled are final. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["printing", "cancelled"],
  printing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export const deliveryAreaSchema = z.enum(["inside_valley", "outside_valley"]);
export type DeliveryArea = z.infer<typeof deliveryAreaSchema>;

export const paymentMethodSchema = z.enum(["whatsapp", "esewa", "khalti", "bank"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const orderCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^MOM-\d{4}-\d{4,}$/, "Invalid order code");

/** Customer photos for print orders. Only images uploaded to our own Cloudinary `orders` folder. */
export const ORDER_PHOTO_LIMIT = 30;
export const orderPhotoUrlSchema = imageUrlSchema.regex(
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*momento\/orders\//,
  "Photo must be uploaded through Momento",
);

/** The client sends only ids and quantities. Prices are always recomputed on the server. */
export const orderItemInputSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.optional(),
  quantity: z.number().int().min(1).max(50),
});

export const orderCustomerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema,
  address: z.string().trim().min(3).max(300),
  area: deliveryAreaSchema,
});

export const createOrderInputSchema = z.object({
  customer: orderCustomerSchema,
  items: z.array(orderItemInputSchema).min(1).max(30),
  couponCode: couponCodeSchema.optional(),
  /** Flag `referrals`. A friend's code: takes a fixed amount off the first order. */
  referralCode: referralCodeSchema.optional(),
  /** Flag `giftCards`. Pays part or all of the order from the card balance. */
  giftCardCode: giftCardCodeSchema.optional(),
  paymentMethod: paymentMethodSchema.default("whatsapp"),
  note: z.string().trim().max(500).optional(),
  photos: z.array(orderPhotoUrlSchema).max(ORDER_PHOTO_LIMIT).default([]),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const orderItemSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.optional(),
  title: z.string(),
  image: z.string().optional(),
  variantLabel: z.string().optional(),
  unitPrice: priceSchema,
  quantity: z.number().int(),
  lineTotal: priceSchema,
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  customer: orderCustomerSchema.extend({ phone: z.string() }),
  items: z.array(orderItemSchema),
  subtotal: priceSchema,
  deliveryFee: priceSchema,
  discount: priceSchema,
  couponCode: z.string().optional(),
  referralCode: z.string().optional(),
  referralDiscount: priceSchema.default(0),
  giftCardCode: z.string().optional(),
  giftCardApplied: priceSchema.default(0),
  total: priceSchema,
  status: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  note: z.string().optional(),
  photos: z.array(z.string()).default([]),
  adminNotes: z.string().optional(),
  statusHistory: z.array(
    z.object({ status: orderStatusSchema, at: z.string(), by: z.string().optional() }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Order = z.infer<typeof orderSchema>;

export const updateOrderStatusInputSchema = z.object({
  status: orderStatusSchema,
  adminNotes: z.string().trim().max(1000).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

/** Staff-only notes on an order. An empty string clears them. */
export const updateOrderNotesInputSchema = z.object({
  adminNotes: z.string().trim().max(1000),
});
export type UpdateOrderNotesInput = z.infer<typeof updateOrderNotesInputSchema>;

export const orderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const trackOrderInputSchema = z.object({
  code: orderCodeSchema,
  phone: phoneSchema,
});
export type TrackOrderInput = z.infer<typeof trackOrderInputSchema>;

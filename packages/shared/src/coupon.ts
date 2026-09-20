import { z } from "zod";
import { objectIdSchema, priceSchema } from "./common";

export const couponTypeSchema = z.enum(["percent", "fixed"]);
export type CouponType = z.infer<typeof couponTypeSchema>;

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/, "Code must be 3-32 letters, digits, _ or -");

const couponBase = z.object({
  code: couponCodeSchema,
  type: couponTypeSchema,
  /** Percent (1-100) or a fixed NPR amount. */
  value: z.number().int().min(1),
  minOrderAmount: priceSchema.optional(),
  expiresAt: z.coerce.date().optional(),
  usageLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
});

export const couponInputSchema = couponBase.refine(
  (coupon) => coupon.type !== "percent" || coupon.value <= 100,
  { message: "Percent coupons cannot exceed 100", path: ["value"] },
);
export type CouponInput = z.infer<typeof couponInputSchema>;

export const couponUpdateSchema = couponBase.partial();

export const couponSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  type: couponTypeSchema,
  value: z.number(),
  minOrderAmount: z.number().optional(),
  expiresAt: z.string().optional(),
  usageLimit: z.number().optional(),
  usedCount: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type Coupon = z.infer<typeof couponSchema>;

export const couponValidateInputSchema = z.object({
  code: couponCodeSchema,
  subtotal: priceSchema,
});
export type CouponValidateInput = z.infer<typeof couponValidateInputSchema>;

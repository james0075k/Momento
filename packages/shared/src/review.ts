import { z } from "zod";
import { imageUrlSchema, objectIdSchema, paginationQuerySchema, phoneSchema } from "./common";

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const reviewInputSchema = z
  .object({
    productId: objectIdSchema.optional(),
    serviceId: objectIdSchema.optional(),
    name: z.string().trim().min(1).max(80),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(120).optional(),
    comment: z.string().trim().min(1).max(2000),
    photos: z.array(imageUrlSchema).max(5).default([]),
    /** With orderPhone: if both match a real order containing the reviewed product, the review is marked verified. */
    orderCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^MOM-\d{4}-\d{4,}$/)
      .optional(),
    orderPhone: phoneSchema.optional(),
  })
  .refine((review) => Boolean(review.orderCode) === Boolean(review.orderPhone), {
    message: "orderCode and orderPhone must be sent together",
    path: ["orderCode"],
  })
  .refine((review) => Boolean(review.productId) !== Boolean(review.serviceId), {
    message: "Provide exactly one of productId or serviceId",
    path: ["productId"],
  });
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const reviewModerationSchema = z.object({ status: reviewStatusSchema });
export type ReviewModeration = z.infer<typeof reviewModerationSchema>;

/** The shop's public answer to a review. An empty string removes it. */
export const reviewReplyInputSchema = z.object({ reply: z.string().trim().max(1000) });
export type ReviewReplyInput = z.infer<typeof reviewReplyInputSchema>;

export const reviewSchema = z.object({
  id: objectIdSchema,
  productId: objectIdSchema.optional(),
  serviceId: objectIdSchema.optional(),
  name: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string(),
  photos: z.array(z.string()),
  status: reviewStatusSchema,
  verified: z.boolean(),
  /** The shop's public reply, shown under the review once it is approved. */
  reply: z.string().optional(),
  repliedAt: z.string().optional(),
  /** Admin/staff only. */
  verifiedOrderCode: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Review = z.infer<typeof reviewSchema>;

export const reviewListQuerySchema = paginationQuerySchema.extend({
  productId: objectIdSchema.optional(),
  serviceId: objectIdSchema.optional(),
  /** Admin/staff only. Public callers always get approved reviews. */
  status: reviewStatusSchema.optional(),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

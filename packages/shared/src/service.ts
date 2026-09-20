import { z } from "zod";
import { imageUrlSchema, objectIdSchema, priceSchema, slugSchema } from "./common";

export const serviceInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: slugSchema,
  description: z.string().max(10_000).default(""),
  icon: z.string().trim().max(60).optional(),
  image: imageUrlSchema.optional(),
  startingPrice: priceSchema.optional(),
  showOnHome: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type ServiceInput = z.infer<typeof serviceInputSchema>;

export const serviceUpdateSchema = serviceInputSchema.partial();

export const serviceSchema = serviceInputSchema.extend({
  id: objectIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Service = z.infer<typeof serviceSchema>;

import { z } from "zod";
import { imageUrlSchema, objectIdSchema, slugSchema } from "./common";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: slugSchema,
  image: imageUrlSchema.optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.partial();

export const categorySchema = categoryInputSchema.extend({
  id: objectIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

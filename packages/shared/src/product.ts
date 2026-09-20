import { z } from "zod";
import {
  imageUrlSchema,
  objectIdSchema,
  paginationQuerySchema,
  priceSchema,
  queryBooleanSchema,
  slugSchema,
} from "./common";

export const productVariantInputSchema = z.object({
  /** Send the existing id when editing so carts keep pointing at the variant. */
  id: objectIdSchema.optional(),
  size: z.string().trim().min(1).max(60),
  cover: z.string().trim().max(60).optional(),
  pages: z.number().int().min(1).max(1000).optional(),
  price: priceSchema,
});

export const productSpecSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
});
export type ProductSpec = z.infer<typeof productSpecSchema>;

export const productFaqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});
export type ProductFaq = z.infer<typeof productFaqSchema>;

export const productInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: slugSchema,
  categoryId: objectIdSchema,
  shortDescription: z.string().trim().max(300).default(""),
  /** Rich text (HTML). The web app must sanitize it before rendering. */
  description: z.string().max(20_000).default(""),
  images: z.array(imageUrlSchema).max(12).default([]),
  basePrice: priceSchema,
  variants: z.array(productVariantInputSchema).max(50).default([]),
  highlights: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  /** Occasion slugs (wedding, dashain, tihar, baby, travel...) used by the shop filter. */
  occasions: z.array(slugSchema).max(10).default([]),
  specs: z.array(productSpecSchema).max(30).default([]),
  faqs: z.array(productFaqSchema).max(30).default([]),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema.partial();

export const productVariantSchema = productVariantInputSchema.extend({ id: objectIdSchema });
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productSchema = productInputSchema.extend({
  id: objectIdSchema,
  variants: z.array(productVariantSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Product = z.infer<typeof productSchema>;

export const productListQuerySchema = paginationQuerySchema.extend({
  /** Category id or slug. */
  category: z.string().min(1).max(120).optional(),
  /** Occasion slug. */
  occasion: slugSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  /** Comma-separated product ids (max 24), for the wishlist and recently viewed lists. */
  ids: z
    .string()
    .max(24 * 25)
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(objectIdSchema).min(1).max(24))
    .optional(),
  featured: queryBooleanSchema.optional(),
  /** Admin/staff only: include inactive products. */
  includeInactive: queryBooleanSchema.optional(),
  /** Admin/staff only: only active (true) or only hidden (false) products. Ignored for the public. */
  active: queryBooleanSchema.optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "title"]).default("newest"),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

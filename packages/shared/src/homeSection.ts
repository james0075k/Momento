import { z } from "zod";
import { objectIdSchema } from "./common";

export const homeSectionTypeSchema = z.enum([
  "hero",
  "services",
  "featured",
  "reviews",
  "guarantees",
  "gallery",
]);
export type HomeSectionType = z.infer<typeof homeSectionTypeSchema>;

export const homeSectionInputSchema = z.object({
  type: homeSectionTypeSchema,
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(300).optional(),
  /** Ids of the products, services or reviews this section shows, in display order. */
  itemRefs: z.array(objectIdSchema).max(50).default([]),
  order: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});
export type HomeSectionInput = z.infer<typeof homeSectionInputSchema>;

export const homeSectionUpdateSchema = homeSectionInputSchema.partial();

export const homeSectionSchema = homeSectionInputSchema.extend({
  id: objectIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HomeSection = z.infer<typeof homeSectionSchema>;

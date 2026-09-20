import { z } from "zod";

export const currencySchema = z.literal("NPR");
export type Currency = z.infer<typeof currencySchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, digits and hyphens");

/** Whole Nepali rupees. */
export const priceSchema = z.number().int().nonnegative().max(10_000_000);

export const imageUrlSchema = z.string().url().max(500);

/** Accepts "98XXXXXXXX", "+977 98-XXXXXXXX" etc. and stores digits (with an optional leading +). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,17}$/, "Invalid phone number")
  .transform((value) => {
    const digits = value.replace(/[^0-9]/g, "");
    return value.startsWith("+") ? `+${digits}` : digits;
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const idParamsSchema = z.object({ id: objectIdSchema });

/** Query strings send booleans as "true" or "false". */
export const queryBooleanSchema = z.enum(["true", "false"]).transform((value) => value === "true");

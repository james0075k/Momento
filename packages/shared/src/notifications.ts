import { z } from "zod";
import { orderStatusSchema } from "./order";

/** A calendar day in Nepal, written YYYY-MM-DD. Real dates only (no 2026-02-31). */
export const dayStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Not a real date");

export const dailySummaryQuerySchema = z.object({ day: dayStringSchema.optional() });
export type DailySummaryQuery = z.infer<typeof dailySummaryQuerySchema>;

export const sendSummaryInputSchema = z.object({
  day: dayStringSchema.optional(),
  /** Build and return the summary without sending the email or marking anything. */
  dryRun: z.boolean().default(false),
});
export type SendSummaryInput = z.infer<typeof sendSummaryInputSchema>;

/** Both bounds are inclusive days. Leave them out to export everything (up to the row cap). */
export const orderExportQuerySchema = z.object({
  from: dayStringSchema.optional(),
  to: dayStringSchema.optional(),
  status: orderStatusSchema.optional(),
});
export type OrderExportQuery = z.infer<typeof orderExportQuerySchema>;

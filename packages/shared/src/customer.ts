import { z } from "zod";
import { paginationQuerySchema } from "./common";

export const customerListQuerySchema = paginationQuerySchema.extend({
  /** Matches the name or the phone number. */
  q: z.string().trim().min(1).max(100).optional(),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

/** One person, worked out from their orders: the same phone (last 10 digits) is the same customer. */
export interface Customer {
  /** The last 10 digits of the phone, which is also what identifies the customer. */
  key: string;
  name: string;
  phone: string;
  orders: number;
  /** Cancelled orders are not counted. */
  spent: number;
  firstOrderAt: string;
  lastOrderAt: string;
}

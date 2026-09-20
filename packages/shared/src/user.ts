import { z } from "zod";
import { objectIdSchema, phoneSchema } from "./common";

export const userRoleSchema = z.enum(["admin", "staff"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: objectIdSchema,
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().email(),
  role: userRoleSchema,
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(200);

export const createUserInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: phoneSchema.optional(),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  role: userRoleSchema.default("staff"),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

import { passwordSchema } from "@momento/shared";
import { z } from "zod";
import { UserModel } from "../models/User";
import { hashPassword } from "../services/auth";

const adminSeedSchema = z.object({
  name: z.string().trim().min(1, "FIRST_ADMIN_NAME is required"),
  email: z.string().trim().toLowerCase().email("FIRST_ADMIN_EMAIL must be a valid email"),
  password: passwordSchema,
});

export type AdminSeedInput = z.input<typeof adminSeedSchema>;

/** Creates the first admin. Returns false (and changes nothing) if that email already exists. */
export async function seedAdmin(input: AdminSeedInput): Promise<boolean> {
  const { name, email, password } = adminSeedSchema.parse(input);
  if (await UserModel.exists({ email })) return false;
  await UserModel.create({
    name,
    email,
    role: "admin",
    passwordHash: await hashPassword(password),
  });
  return true;
}

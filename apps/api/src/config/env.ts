import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  COOKIE_DOMAIN: z.string().min(1).optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SHOP_WHATSAPP_NUMBER: z.string().optional(),
  FIRST_ADMIN_NAME: z.string().optional(),
  FIRST_ADMIN_EMAIL: z.string().optional(),
  FIRST_ADMIN_PASSWORD: z.string().optional(),
  WEB_REVALIDATE_URL: z.string().url().optional(),
  REVALIDATE_SECRET: z.string().min(16).optional(),
  /** Requests per IP per 15 minutes across the whole API. Only raised for the browser test run. */
  RATE_LIMIT_GLOBAL: z.coerce.number().int().min(1).default(300),
  REFERRAL_PEPPER: z.string().min(16).optional(),
  /** Public web address, used in links inside emails and WhatsApp messages. */
  SITE_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Comma-separated addresses that get the daily summary. */
  SUMMARY_TO_EMAIL: z.string().optional(),
  /** Must be an address on a domain verified in Resend. */
  SUMMARY_FROM_EMAIL: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

// A line like `COOKIE_DOMAIN=` in .env (the way .env.example lists every name) means "not set", not "an empty value".
const source = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ""),
);
const parsed = envSchema.safeParse(source);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === "production") {
  const weak = (secret?: string): boolean => !secret || secret.length < 32;
  if (weak(parsed.data.JWT_ACCESS_SECRET) || weak(parsed.data.JWT_REFRESH_SECRET)) {
    console.error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set (32+ chars) in production");
    process.exit(1);
  }
}

const corsAllowedOrigins =
  parsed.data.CORS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

export const env = {
  ...parsed.data,
  corsAllowedOrigins,
};

/** Reads a required secret at the point of use so dev without auth env still boots. */
export function requireEnv(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

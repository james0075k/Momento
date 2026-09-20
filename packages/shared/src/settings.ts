import { z } from "zod";
import { priceSchema } from "./common";
import { bannerSchema, referralSettingsSchema } from "./promotions";

/**
 * Phase 8 feature flags. Every extra sits behind one of these, and off means the site behaves exactly
 * as it did before the feature existed: no UI, no requests, and the API routes answer 404.
 */
export const FEATURE_KEYS = [
  "wishlist",
  "recentlyViewed",
  "alsoBought",
  "share",
  "festivalBanner",
  "referrals",
  "giftCards",
  "orderAgain",
  "nepali",
  "bikramSambatDates",
  "orderAlerts",
  "dailySummary",
  "photoEditor",
  "csvExport",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureFlags = Record<FeatureKey, boolean>;

const flag = z.boolean().optional();
/** Partial on purpose: an update names only the flags it changes, so the others are never reset. */
export const featureFlagsInputSchema = z.object({
  wishlist: flag,
  recentlyViewed: flag,
  alsoBought: flag,
  share: flag,
  festivalBanner: flag,
  referrals: flag,
  giftCards: flag,
  orderAgain: flag,
  nepali: flag,
  bikramSambatDates: flag,
  orderAlerts: flag,
  dailySummary: flag,
  photoEditor: flag,
  csvExport: flag,
});

/** Every flag as a real boolean, false when unset, so old settings documents keep working. */
export function resolveFeatures(features?: Partial<FeatureFlags>): FeatureFlags {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, features?.[key] === true]),
  ) as FeatureFlags;
}

export const isFeatureOn = (
  settings: { features?: Partial<FeatureFlags> } | null | undefined,
  key: FeatureKey,
): boolean => settings?.features?.[key] === true;

export const settingsInputSchema = z.object({
  shopWhatsappNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{8,15}$/, "Digits only, with country code (e.g. 97798XXXXXXXX)"),
  deliveryFees: z.object({
    insideValley: priceSchema,
    outsideValley: priceSchema,
    /** Orders with a subtotal at or above this get free delivery. */
    freeDeliveryThreshold: priceSchema.optional(),
  }),
  socialLinks: z
    .object({
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
      tiktok: z.string().url().optional(),
      youtube: z.string().url().optional(),
    })
    .default({}),
  paymentDetails: z
    .object({
      esewaId: z.string().trim().max(60).optional(),
      khaltiId: z.string().trim().max(60).optional(),
      bankName: z.string().trim().max(100).optional(),
      bankAccountName: z.string().trim().max(100).optional(),
      bankAccountNumber: z.string().trim().max(60).optional(),
      qrImage: z.string().url().optional(),
    })
    .default({}),
  features: featureFlagsInputSchema.optional(),
  /** Festival banner (flag `festivalBanner`). */
  /** Send `null` to remove the banner. */
  banner: bannerSchema.nullable().optional(),
  /** What the referral programme pays (flag `referrals`). Defaults apply when unset. */
  referral: referralSettingsSchema.optional(),
  seo: z
    .object({
      defaultTitle: z.string().trim().max(70).optional(),
      defaultDescription: z.string().trim().max(170).optional(),
      ogImage: z.string().url().optional(),
    })
    .default({}),
});
export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type Settings = SettingsInput;

export const DEFAULT_SETTINGS: Settings = {
  shopWhatsappNumber: "9779800000000",
  deliveryFees: { insideValley: 100, outsideValley: 250 },
  socialLinks: {},
  paymentDetails: {},
  seo: {},
};

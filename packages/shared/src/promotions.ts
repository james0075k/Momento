import { z } from "zod";
import { objectIdSchema, priceSchema } from "./common";

/** Referral codes look like MOM-K7Q2XF. Uppercased and trimmed before matching. */
export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,20}$/, "Invalid referral code");

/** Gift card codes look like GC-K7Q2-XF9M. */
export const giftCardCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,24}$/, "Invalid gift card code");

export const referralValidateInputSchema = z.object({ code: referralCodeSchema });
export type ReferralValidateInput = z.infer<typeof referralValidateInputSchema>;

export const giftCardBalanceInputSchema = z.object({ code: giftCardCodeSchema });
export type GiftCardBalanceInput = z.infer<typeof giftCardBalanceInputSchema>;

/** Admin issues a card after the customer has paid (payment is manual). The code is generated when left out. */
export const giftCardInputSchema = z.object({
  amount: priceSchema.refine((value) => value >= 100, "Minimum gift card is NPR 100"),
  code: giftCardCodeSchema.optional(),
  note: z.string().trim().max(200).optional(),
});
export type GiftCardInput = z.infer<typeof giftCardInputSchema>;

export const giftCardUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  note: z.string().trim().max(200).optional(),
});
export type GiftCardUpdate = z.infer<typeof giftCardUpdateSchema>;

export const giftCardSchema = z.object({
  id: objectIdSchema,
  code: z.string(),
  initialAmount: z.number(),
  balance: z.number(),
  isActive: z.boolean(),
  note: z.string().optional(),
  createdAt: z.string(),
});
export type GiftCard = z.infer<typeof giftCardSchema>;

/** What the referral programme pays, in NPR. Held in Settings so the owner can change it. */
export const referralSettingsSchema = z.object({
  /** Off the first order of the friend who uses a code. */
  friendDiscount: priceSchema,
  /** One-use coupon for the referrer when that friend's order is delivered. */
  referrerReward: priceSchema,
});
export type ReferralSettings = z.infer<typeof referralSettingsSchema>;

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  friendDiscount: 100,
  referrerReward: 100,
};

/** A site path ("/shop") or an https link, so the banner cannot point at javascript: or data: URLs. */
const bannerHref = z
  .string()
  .trim()
  .max(300)
  .regex(/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/, "Use a site path like /shop or an https link");

const isoDate = z
  .union([z.string().datetime({ offset: true }), z.date()])
  .transform((value) => new Date(value).toISOString());

export const bannerSchema = z
  .object({
    text: z.string().trim().min(1).max(140),
    href: bannerHref.optional(),
    /** Coupon to pre-fill at checkout when the banner link is followed. */
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/)
      .optional(),
    startsAt: isoDate,
    endsAt: isoDate,
  })
  .refine((banner) => new Date(banner.endsAt) > new Date(banner.startsAt), {
    message: "The banner must end after it starts",
    path: ["endsAt"],
  });
export type Banner = z.infer<typeof bannerSchema>;

/** True while `now` is inside the banner's dates. */
export function bannerIsLive(banner: Banner | undefined | null, now = new Date()): boolean {
  return Boolean(banner && new Date(banner.startsAt) <= now && now < new Date(banner.endsAt));
}

import { createHmac, randomInt } from "node:crypto";
import { DEFAULT_REFERRAL_SETTINGS, type ReferralSettings, type Settings } from "@momento/shared";
import { env, requireEnv } from "../config/env";
import { HttpError } from "../middleware/errorHandler";
import { CouponModel } from "../models/Coupon";
import { GiftCardModel } from "../models/GiftCard";
import { OrderModel } from "../models/Order";
import { ReferralModel, ReferralUseModel } from "../models/Referral";

/** No I, L, O, 0 or 1, so a code read out over the phone or WhatsApp is hard to mistype. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length: number): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/**
 * Keyed hash of a phone's last 10 digits (so +977 98... and 98... match). Lets us recognise the same
 * customer for referral rules without storing another copy of the number.
 */
export function phoneHash(phone: string): string {
  const tail = phone.replace(/\D/g, "").slice(-10);
  const key = env.REFERRAL_PEPPER ?? requireEnv("JWT_ACCESS_SECRET");
  return createHmac("sha256", key).update(`phone:${tail}`).digest("hex");
}

export const referralSettings = (settings: Settings): ReferralSettings =>
  settings.referral ?? DEFAULT_REFERRAL_SETTINGS;

const isDuplicateKey = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;

/** The customer's referral code, created the first time it is needed. */
export async function issueReferralCode(phone: string): Promise<string> {
  const hash = phoneHash(phone);
  const existing = await ReferralModel.findOne({ ownerPhoneHash: hash });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await ReferralModel.create({
        code: `MOM-${randomCode(6)}`,
        ownerPhoneHash: hash,
      });
      return created.code;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
      // Either the same customer raced us, or the random code collided. Looking again handles both.
      const raced = await ReferralModel.findOne({ ownerPhoneHash: hash });
      if (raced) return raced.code;
    }
  }
  throw new HttpError(500, "Could not create a referral code");
}

export async function findReferral(code: string) {
  const referral = await ReferralModel.findOne({ code });
  if (!referral) throw new HttpError(400, "Referral code not found");
  return referral;
}

/**
 * Reserves a referral for this phone: not their own code, and only once per phone (the unique index on
 * ReferralUse makes that atomic). Returns a function that undoes the reservation.
 */
export async function claimReferral(code: string, phone: string): Promise<() => Promise<void>> {
  const referral = await findReferral(code);
  const hash = phoneHash(phone);
  if (hash === referral.ownerPhoneHash) {
    throw new HttpError(400, "You cannot use your own referral code");
  }
  try {
    await ReferralUseModel.create({ phoneHash: hash, referralCode: referral.code });
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw new HttpError(400, "A referral code has already been used with this phone number");
    }
    throw err;
  }
  await ReferralModel.updateOne({ _id: referral._id }, { $inc: { usedCount: 1 } });
  return () => releaseReferral(referral.code, phone);
}

/** Frees the phone to use a referral again (the order failed or was cancelled). Safe to call twice. */
export async function releaseReferral(code: string, phone: string): Promise<void> {
  const removed = await ReferralUseModel.findOneAndDelete({
    phoneHash: phoneHash(phone),
    referralCode: code,
  });
  if (removed) {
    await ReferralModel.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  }
}

/** When a referred friend's order is delivered, the referrer earns a one-use coupon (once per order). */
export async function issueReferrerReward(
  order: { _id: unknown; referralCode?: string | null },
  settings: Settings,
): Promise<void> {
  if (!order.referralCode) return;
  const { referrerReward } = referralSettings(settings);
  if (referrerReward <= 0) return;

  const claimed = await OrderModel.findOneAndUpdate(
    { _id: order._id, referralRewardIssued: { $ne: true } },
    { $set: { referralRewardIssued: true } },
  );
  if (!claimed) return;
  const referral = await ReferralModel.findOne({ code: order.referralCode });
  if (!referral) return;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const coupon = await CouponModel.create({
        code: `THANKS-${randomCode(6)}`,
        type: "fixed",
        value: referrerReward,
        usageLimit: 1,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      });
      await ReferralModel.updateOne(
        { _id: referral._id },
        {
          $push: {
            rewards: { couponCode: coupon.code, orderCode: claimed.code, issuedAt: new Date() },
          },
        },
      );
      return;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err;
    }
  }
}

/** What a customer sees about their referral on the tracking page. Only usable reward coupons are listed. */
export async function referralSummary(phone: string, settings: Settings) {
  const referral = await ReferralModel.findOne({ ownerPhoneHash: phoneHash(phone) });
  if (!referral) return undefined;
  const codes = referral.rewards.map((reward) => reward.couponCode);
  const coupons = codes.length
    ? await CouponModel.find({ code: { $in: codes }, isActive: true })
    : [];
  const now = Date.now();
  const rewards = coupons
    .filter(
      (coupon) =>
        (coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit) &&
        (!coupon.expiresAt || coupon.expiresAt.getTime() > now),
    )
    .map((coupon) => ({ code: coupon.code, value: coupon.value }));
  return {
    code: referral.code,
    friendDiscount: referralSettings(settings).friendDiscount,
    rewards,
  };
}

export const generateGiftCardCode = (): string => `GC-${randomCode(4)}-${randomCode(4)}`;

/** Takes `amount` off the card only if the balance still covers it (atomic, so two orders cannot overspend). */
export async function claimGiftCard(cardId: unknown, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  const updated = await GiftCardModel.findOneAndUpdate(
    { _id: cardId, isActive: true, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
  );
  return Boolean(updated);
}

/** Puts money back on the card, never above what it was issued for. */
export async function releaseGiftCard(code: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await GiftCardModel.updateOne({ code }, [
    { $set: { balance: { $min: ["$initialAmount", { $add: ["$balance", amount] }] } } },
  ]);
}

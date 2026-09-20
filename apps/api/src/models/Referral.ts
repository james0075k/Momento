import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

/**
 * One referral code per customer, issued when one of their orders is delivered. The customer is
 * identified only by a keyed hash of the phone number, never the number itself.
 */
const referralSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    ownerPhoneHash: { type: String, required: true, unique: true },
    usedCount: { type: Number, default: 0, min: 0 },
    /** One-use coupons earned when a friend's order was delivered. */
    rewards: {
      type: [
        new Schema(
          {
            couponCode: { type: String, required: true },
            orderCode: { type: String, required: true },
            issuedAt: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const ReferralModel = mongoose.model("Referral", referralSchema);

/** A phone number may use a referral discount once. The unique index makes that atomic. */
const referralUseSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    referralCode: { type: String, required: true },
    orderCode: { type: String },
  },
  { timestamps: true },
);

export const ReferralUseModel = mongoose.model("ReferralUse", referralUseSchema);

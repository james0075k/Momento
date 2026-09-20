import "./jsonTransform";
import { FEATURE_KEYS } from "@momento/shared";
import mongoose, { Schema } from "mongoose";

/** Singleton document, keyed by `key: "main"`. */
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    shopWhatsappNumber: { type: String, required: true },
    deliveryFees: {
      insideValley: { type: Number, required: true, min: 0 },
      outsideValley: { type: Number, required: true, min: 0 },
      freeDeliveryThreshold: { type: Number, min: 0 },
    },
    socialLinks: {
      facebook: String,
      instagram: String,
      tiktok: String,
      youtube: String,
    },
    paymentDetails: {
      esewaId: String,
      khaltiId: String,
      bankName: String,
      bankAccountName: String,
      bankAccountNumber: String,
      qrImage: String,
    },
    features: Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, { type: Boolean, default: false }]),
    ),
    banner: {
      text: String,
      href: String,
      couponCode: String,
      startsAt: Date,
      endsAt: Date,
    },
    referral: {
      friendDiscount: { type: Number, min: 0 },
      referrerReward: { type: Number, min: 0 },
    },
    seo: {
      defaultTitle: String,
      defaultDescription: String,
      ogImage: String,
    },
  },
  { timestamps: true },
);

export const SettingsModel = mongoose.model("Settings", settingsSchema);

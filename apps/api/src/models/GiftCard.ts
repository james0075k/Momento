import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

const giftCardSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    initialAmount: { type: Number, required: true, min: 1 },
    balance: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    note: { type: String },
  },
  { timestamps: true },
);

export const GiftCardModel = mongoose.model("GiftCard", giftCardSchema);

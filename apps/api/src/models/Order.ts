import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

const ORDER_STATUSES = ["pending_payment", "paid", "printing", "shipped", "delivered", "cancelled"];

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    image: { type: String },
    variantLabel: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      area: { type: String, enum: ["inside_valley", "outside_valley"], required: true },
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    couponCode: { type: String },
    /** Phase 8 (flags `referrals`, `giftCards`). Zero and unset when the features are off. */
    referralCode: { type: String },
    referralDiscount: { type: Number, default: 0, min: 0 },
    referralRewardIssued: { type: Boolean },
    giftCardCode: { type: String },
    giftCardApplied: { type: Number, default: 0, min: 0 },
    /** Keyed hash of the phone (last 10 digits), so repeat customers can be matched without the number. */
    phoneHash: { type: String, index: true },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, required: true, default: "pending_payment" },
    paymentMethod: { type: String, enum: ["whatsapp", "esewa", "khalti", "bank"], required: true },
    note: { type: String },
    photos: { type: [String], default: [] },
    adminNotes: { type: String },
    /** Set when the daily summary email asked staff to request a review for this delivered order. */
    reviewRequestSentAt: { type: Date },
    statusHistory: {
      type: [
        new Schema(
          {
            status: { type: String, enum: ORDER_STATUSES, required: true },
            at: { type: Date, required: true },
            by: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// The unfiltered orders list, the dashboard and the customers pipeline all sort or range on createdAt.
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });

export const OrderModel = mongoose.model("Order", orderSchema);

/** Atomic per-year counters used to generate order codes. */
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel = mongoose.model("Counter", counterSchema);

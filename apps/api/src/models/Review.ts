import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service" },
    name: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String, required: true },
    photos: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    /** The shop's public answer, shown under the review once it is approved. */
    reply: { type: String },
    repliedAt: { type: Date },
    verified: { type: Boolean, default: false },
    verifiedOrderCode: { type: String },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ serviceId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export const ReviewModel = mongoose.model("Review", reviewSchema);

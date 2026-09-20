import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

const serviceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    icon: { type: String },
    image: { type: String },
    startingPrice: { type: Number, min: 0 },
    showOnHome: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

serviceSchema.index(
  { title: "text", description: "text" },
  { weights: { title: 5, description: 1 } },
);
serviceSchema.index({ isActive: 1, order: 1 });

export const ServiceModel = mongoose.model("Service", serviceSchema);

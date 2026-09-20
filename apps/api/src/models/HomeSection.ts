import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

const homeSectionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["hero", "services", "featured", "reviews", "guarantees", "gallery"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String },
    itemRefs: { type: [Schema.Types.ObjectId], default: [] },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

homeSectionSchema.index({ isVisible: 1, order: 1 });

export const HomeSectionModel = mongoose.model("HomeSection", homeSectionSchema);

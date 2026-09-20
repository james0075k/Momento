import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

const variantSchema = new Schema({
  size: { type: String, required: true },
  cover: { type: String },
  pages: { type: Number },
  price: { type: Number, required: true, min: 0 },
});

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    shortDescription: { type: String, default: "" },
    description: { type: String, default: "" },
    images: { type: [String], default: [] },
    basePrice: { type: Number, required: true, min: 0 },
    variants: { type: [variantSchema], default: [] },
    highlights: { type: [String], default: [] },
    occasions: { type: [String], default: [] },
    specs: {
      type: [new Schema({ label: String, value: String }, { _id: false })],
      default: [],
    },
    faqs: {
      type: [new Schema({ question: String, answer: String }, { _id: false })],
      default: [],
    },
    seoTitle: { type: String },
    seoDescription: { type: String },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index(
  { title: "text", description: "text" },
  { weights: { title: 5, description: 1 } },
);
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ occasions: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

export const ProductModel = mongoose.model("Product", productSchema);

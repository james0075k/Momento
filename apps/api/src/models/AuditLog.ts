import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

/**
 * One row per state-changing request made by a signed-in staff member or admin.
 * It records who did what and when, never the request body, so no customer data lands here.
 */
const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["admin", "staff"], required: true },
    method: { type: String, required: true },
    /** Request path without the query string, e.g. /products/66f1.../ */
    path: { type: String, required: true, maxlength: 200 },
    status: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Kept for a year, then MongoDB deletes the row.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);

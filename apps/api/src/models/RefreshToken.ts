import "./jsonTransform";
import mongoose, { Schema } from "mongoose";

/** One row per issued refresh token. Rotation revokes the old row and links to the new one. */
const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jti: { type: String, required: true, unique: true },
    /** All tokens descended from one login share a family, so reuse can revoke the whole chain. */
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedBy: { type: String },
  },
  { timestamps: true },
);

// TTL: MongoDB deletes rows once they expire.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model("RefreshToken", refreshTokenSchema);

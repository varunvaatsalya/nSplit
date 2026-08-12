import mongoose from "mongoose";
import { applyIdTransform } from "./_utils.js";

const { Schema, models, model } = mongoose;

const PasswordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

applyIdTransform(PasswordResetSchema);

export const PasswordReset =
  models.PasswordReset || model("PasswordReset", PasswordResetSchema);

/** @deprecated alias — prefer PasswordReset */
export const PasswordResetToken = PasswordReset;

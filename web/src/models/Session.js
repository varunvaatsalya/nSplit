import mongoose from "mongoose";
import { applyIdTransform } from "./_utils.js";

const { Schema, models, model } = mongoose;

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    deviceId: { type: String, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

applyIdTransform(SessionSchema);

export const Session = models.Session || model("Session", SessionSchema);

import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

export const FeedbackType = { BUG: "bug", IDEA: "idea", OTHER: "other" };

/**
 * A bug report, idea or other note sent from the app or web. Context (where it
 * was sent from, platform, version) is filled in by the client, not the user,
 * so reports can be traced back to a screen without asking.
 */
const FeedbackSchema = new Schema(
  {
    type: { type: String, enum: Object.values(FeedbackType), required: true },
    message: { type: String, required: true, maxlength: 2000 },
    // Screen it was sent from, e.g. "profile" or "group-settings".
    source: { type: String, default: null, maxlength: 60 },
    // Group id or code when sent from inside a group, plus its name at the time.
    groupRef: { type: String, default: null, maxlength: 64 },
    groupName: { type: String, default: null },
    // Signed-out users can send too; these stay null then.
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userName: { type: String, default: null },
    userEmail: { type: String, default: null },
    platform: { type: String, default: null, maxlength: 20 },
    appVersion: { type: String, default: null, maxlength: 40 },
    osVersion: { type: String, default: null, maxlength: 40 },
    userAgent: { type: String, default: null, maxlength: 400 },
    // Hashed so spam can be rate limited without storing raw addresses.
    ipHash: { type: String, default: null },
    // For the review panel later.
    status: { type: String, enum: ["new", "seen", "done"], default: "new" },
  },
  { timestamps: true }
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ type: 1, status: 1, createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });
FeedbackSchema.index({ ipHash: 1, createdAt: -1 });

export const Feedback = models.Feedback || model("Feedback", FeedbackSchema);

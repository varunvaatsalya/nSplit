import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

/**
 * A group a signed-in user added to their home by pasting its share link, to
 * view it read-only. It stays valid only while the group's link is unchanged:
 * if the link is turned off or replaced, it shows as expired.
 */
const SavedShareSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    token: { type: String, required: true },
    // Shown on the expired card so the user knows which group it was.
    groupName: { type: String, default: null },
    groupIcon: { type: String, default: null },
  },
  { timestamps: true }
);

SavedShareSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export const SavedShare = models.SavedShare || model("SavedShare", SavedShareSchema);

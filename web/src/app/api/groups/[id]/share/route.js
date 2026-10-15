import { connectDb } from "@/lib/db";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { createShareToken, shareInfo } from "@/lib/share";
import { Group } from "@/models";
import { Actions } from "@/shared/permissions/index.js";

/** Only group admins manage the public link. */
async function authorize(params) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { id: code } = await params;
  try {
    const membership = await requireGroupPermission(auth.user._id, code, Actions.MANAGE_SETTINGS);
    return { auth, membership };
  } catch (e) {
    return { error: fail(e.message, e.status || 403, e.code || "FORBIDDEN") };
  }
}

export async function GET(request, { params }) {
  const { error, membership } = await authorize(params);
  if (error) return error;
  await connectDb();
  const group = await Group.findById(membership.groupId).select("share").lean();
  return ok({ share: shareInfo(request, group) });
}

/** Turn the link on. `{ rotate: true }` replaces it, so the old link stops working. */
export async function POST(request, { params }) {
  const { error, auth, membership } = await authorize(params);
  if (error) return error;
  const body = await request.json().catch(() => ({}));

  await connectDb();
  const group = await Group.findById(membership.groupId);
  if (!group) return fail("Group not found", 404);

  if (!group.share?.token || body?.rotate) {
    group.share = { token: createShareToken(), createdAt: new Date(), createdById: auth.user._id };
    await group.save();
    await recordActivity({
      groupId: group._id,
      actorId: auth.user._id,
      action: "SETTINGS_CHANGED",
      entityType: "group",
      entityId: group._id,
      metadata: { shareLink: body?.rotate ? "rotated" : "enabled" },
    });
  }
  return ok({ share: shareInfo(request, group) });
}

/** Turn the link off; anyone holding it loses access immediately. */
export async function DELETE(request, { params }) {
  const { error, auth, membership } = await authorize(params);
  if (error) return error;

  await connectDb();
  const group = await Group.findById(membership.groupId);
  if (!group) return fail("Group not found", 404);
  if (group.share?.token) {
    group.share = undefined;
    await group.save();
    await recordActivity({
      groupId: group._id,
      actorId: auth.user._id,
      action: "SETTINGS_CHANGED",
      entityType: "group",
      entityId: group._id,
      metadata: { shareLink: "disabled" },
    });
  }
  return ok({ share: shareInfo(request, null) });
}

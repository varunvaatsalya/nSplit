import { z } from "zod";

import { connectDb } from "@/lib/db";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { listSavedShares, tokenFromInput } from "@/lib/saved-shares";
import { Group, SavedShare, activeMembers } from "@/models";

/** Groups the user added by link, to view (and ask to join). */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  await connectDb();
  return ok({ shares: await listSavedShares(auth.user) });
}

const addSchema = z.object({ link: z.string().trim().min(1).max(500) });

/** "Add existing group": save a pasted share link to the user's home. */
export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const token = tokenFromInput(parsed.data.link);
  if (!token) return fail("That doesn't look like an nSplit group link", 422);

  await connectDb();
  const group = await Group.findOne({ "share.token": token }).lean();
  if (!group) return fail("This link was turned off or does not exist", 404);

  if (activeMembers(group).some((m) => m.userId && String(m.userId) === String(auth.user._id))) {
    return ok({ member: true, groupCode: group.code });
  }

  await SavedShare.findOneAndUpdate(
    { userId: auth.user._id, groupId: group._id },
    { $set: { token, groupName: group.name, groupIcon: group.icon ?? null } },
    { upsert: true }
  );
  return ok({ member: false, token });
}

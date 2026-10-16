import { z } from "zod";

import { connectDb } from "@/lib/db";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import { RequestError, approveRequest, rejectRequest, serializeRequest } from "@/lib/share-requests";
import { ShareRequest } from "@/models";
import { Actions } from "@/shared/permissions/index.js";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(200).optional().nullable(),
});

/** Approve (creates the expense / transfer) or decline a share-link request. */
export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id: code, requestId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(String(requestId))) return fail("Request not found", 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_GROUP);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const existing = await ShareRequest.findOne({ _id: requestId, groupId: membership.groupId }).lean();
  if (!existing) return fail("Request not found", 404);

  // Joins need member management; records need the right to add them yourself.
  const needed =
    existing.kind === "join"
      ? Actions.MANAGE_MEMBERS
      : existing.kind === "expense"
        ? Actions.ADD_EXPENSE
        : Actions.ADD_TRANSFER;
  try {
    await requireGroupPermission(auth.user._id, code, needed);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  try {
    const reviewed =
      parsed.data.action === "approve"
        ? await approveRequest({ requestId, groupId: membership.groupId, user: auth.user })
        : await rejectRequest({ requestId, groupId: membership.groupId, user: auth.user, reason: parsed.data.reason });
    return ok({ request: serializeRequest(reviewed) });
  } catch (e) {
    if (e instanceof RequestError) return fail(e.message, e.status);
    throw e;
  }
}

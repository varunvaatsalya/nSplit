import { connectDb } from "@/lib/db";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import {
  RequestError,
  assertWithinLimits,
  buildPayload,
  memberRequestSchema,
  serializeRequest,
} from "@/lib/share-requests";
import { Group, ShareRequest } from "@/models";
import { Actions, can } from "@/shared/permissions/index.js";

async function membership(params) {
  const auth = await requireAuth();
  if (auth.error) return { error: auth.error };
  const { id: code } = await params;
  try {
    const m = await requireGroupPermission(auth.user._id, code, Actions.VIEW_GROUP);
    return { auth, membership: m };
  } catch (e) {
    return { error: fail(e.message, e.status || 403, e.code || "FORBIDDEN") };
  }
}

/** Members who can review get the inbox; everyone else sees their own requests. */
function canReview(permission) {
  return can(permission, Actions.ADD_EXPENSE) || can(permission, Actions.MANAGE_MEMBERS);
}

/**
 * Reviewers: pending requests (`?status=all` adds recently reviewed ones) and the
 * pending count. Other members: their own requests.
 */
export async function GET(request, { params }) {
  const { error, auth, membership: me } = await membership(params);
  if (error) return error;
  await connectDb();

  const groupId = me.groupId;
  if (!canReview(me.permission)) {
    const mine = await ShareRequest.find({ groupId, requesterUserId: auth.user._id, kind: { $ne: "join" } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return ok({ requests: mine.map(serializeRequest), pending: 0, canReview: false });
  }

  const all = new URL(request.url).searchParams.get("status") === "all";
  // Join requests are for admins only.
  const kinds = can(me.permission, Actions.MANAGE_MEMBERS) ? ["join", "expense", "payment"] : ["expense", "payment"];
  const filter = { groupId, kind: { $in: kinds }, ...(all ? {} : { status: "PENDING" }) };
  const [rows, pending] = await Promise.all([
    ShareRequest.find(filter).sort({ createdAt: -1 }).limit(all ? 50 : 100).lean(),
    ShareRequest.countDocuments({ groupId, kind: { $in: kinds }, status: "PENDING" }),
  ]);
  return ok({ requests: rows.map(serializeRequest), pending, canReview: true });
}

/** A member suggests an expense or a payment, using the same form as a direct save. */
export async function POST(request, { params }) {
  const { error, auth, membership: me } = await membership(params);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = memberRequestSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const group = await Group.findById(me.groupId).lean();
  try {
    await assertWithinLimits(group._id, auth.user._id);
    const payload = buildPayload(group, parsed.data);
    const row = await ShareRequest.create({
      groupId: group._id,
      kind: parsed.data.kind,
      submittedByMemberId: me._id,
      submitterName: me.displayName,
      requesterUserId: auth.user._id,
      requesterName: auth.user.name,
      requesterEmail: auth.user.email,
      payload,
    });
    return ok({ request: serializeRequest(row.toObject()) });
  } catch (e) {
    if (e instanceof RequestError) return fail(e.message, e.status);
    throw e;
  }
}

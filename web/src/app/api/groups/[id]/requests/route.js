import { connectDb } from "@/lib/db";
import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireGroupPermission } from "@/lib/permissions";
import { serializeRequest } from "@/lib/share-requests";
import { ShareRequest } from "@/models";
import { Actions } from "@/shared/permissions/index.js";

/**
 * Requests sent from the group's share link. `?status=pending` (default) for the
 * inbox, `?status=all` to include recently reviewed ones.
 */
export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.ADD_EXPENSE);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const all = new URL(request.url).searchParams.get("status") === "all";
  const filter = { groupId: membership.groupId, ...(all ? {} : { status: "PENDING" }) };
  const [rows, pending] = await Promise.all([
    ShareRequest.find(filter).sort({ createdAt: -1 }).limit(all ? 50 : 100).lean(),
    ShareRequest.countDocuments({ groupId: membership.groupId, status: "PENDING" }),
  ]);
  return ok({ requests: rows.map(serializeRequest), pending });
}

import { connectDb } from "@/lib/db";
import { Group, Transfer, findActiveMemberById } from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { assertCanMutateCreatedRecord, requireGroupPermission } from "@/lib/permissions";
import { serializeTransfer } from "@/lib/transfers/serialize";
import { createTransferSchema } from "@/lib/validations/records";
import { Actions } from "@/shared/permissions/index.js";

async function loadForChange(auth, params) {
  const { id: code, transferId } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.ADD_TRANSFER);
  } catch (e) {
    return { error: fail(e.message, e.status || 403, e.code || "FORBIDDEN") };
  }

  await connectDb();
  const existing = await Transfer.findOne({
    _id: transferId,
    groupId: membership.groupId,
    deletedAt: null,
  });
  if (!existing) return { error: fail("Transfer not found", 404) };

  try {
    assertCanMutateCreatedRecord(membership, existing.createdById, auth.user._id);
  } catch (e) {
    return { error: fail(e.message, e.status || 403, e.code || "FORBIDDEN") };
  }
  return { membership, existing };
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const loaded = await loadForChange(auth, params);
  if (loaded.error) return loaded.error;
  const { membership, existing } = loaded;

  const group = await Group.findById(membership.groupId).lean();
  const from = findActiveMemberById(group, parsed.data.fromMemberId);
  const to = findActiveMemberById(group, parsed.data.toMemberId);
  if (!from || !to) return fail("Invalid transfer members", 422);

  existing.set({
    title: parsed.data.title,
    icon: parsed.data.icon ?? null,
    note: parsed.data.note ?? parsed.data.title,
    amountMinor: parsed.data.amountMinor,
    fromMemberId: parsed.data.fromMemberId,
    toMemberId: parsed.data.toMemberId,
    transferDate: parsed.data.transferDate ? new Date(parsed.data.transferDate) : existing.transferDate,
    version: (existing.version || 1) + 1,
  });
  await existing.save();

  await recordActivity({
    groupId: membership.groupId,
    actorId: auth.user._id,
    action: "TRANSFER_UPDATED",
    entityType: "transfer",
    entityId: existing._id,
    metadata: { title: existing.title, amountMinor: existing.amountMinor },
  });

  return ok({ transfer: serializeTransfer(existing) });
}

export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const loaded = await loadForChange(auth, params);
  if (loaded.error) return loaded.error;
  const { membership, existing } = loaded;

  existing.deletedAt = new Date();
  existing.version = (existing.version || 1) + 1;
  await existing.save();

  await recordActivity({
    groupId: membership.groupId,
    actorId: auth.user._id,
    action: "TRANSFER_DELETED",
    entityType: "transfer",
    entityId: existing._id,
    metadata: { title: existing.title, amountMinor: existing.amountMinor },
  });

  return ok({ success: true });
}

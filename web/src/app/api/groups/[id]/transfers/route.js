import { connectDb, toJSON, withTransaction } from "@/lib/db";
import { Group, MutationLog, Transfer, findActiveMemberById } from "@/models";
import { created, fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { createTransferSchema } from "@/lib/validations/records";

function serializeTransfer(doc) {
  const t = toJSON(doc);
  t.groupId = String(t.groupId);
  t.fromMemberId = String(t.fromMemberId);
  t.toMemberId = String(t.toMemberId);
  t.createdById = String(t.createdById);
  return t;
}

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.VIEW_EXPENSES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  await connectDb();
  const transfers = await Transfer.find({ groupId, deletedAt: null })
    .sort({ transferDate: -1, createdAt: -1 })
    .lean();
  return ok({ transfers: transfers.map(serializeTransfer) });
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: groupId } = await params;
  try {
    await requireGroupPermission(auth.user.id, groupId, Actions.ADD_TRANSFER);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const group = await Group.findById(groupId).lean();
  if (!group) return fail("Group not found", 404);

  const from = findActiveMemberById(group, parsed.data.fromMemberId);
  const to = findActiveMemberById(group, parsed.data.toMemberId);
  if (!from || !to) return fail("Invalid transfer members", 422);

  if (parsed.data.clientMutationId) {
    const existing = await Transfer.findOne({
      clientMutationId: parsed.data.clientMutationId,
    }).lean();
    if (existing) return ok({ transfer: serializeTransfer(existing), duplicate: true });
  }

  const transfer = await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [row] = await Transfer.create(
      [
        {
          groupId,
          fromMemberId: parsed.data.fromMemberId,
          toMemberId: parsed.data.toMemberId,
          amountMinor: parsed.data.amountMinor,
          currency: parsed.data.currency || group.currency,
          note: parsed.data.note ?? null,
          createdById: auth.user.id,
          clientMutationId: parsed.data.clientMutationId ?? undefined,
          transferDate: parsed.data.transferDate
            ? new Date(parsed.data.transferDate)
            : new Date(),
        },
      ],
      opts
    );

    await recordActivity({
      session,
      groupId,
      actorId: auth.user.id,
      action: "TRANSFER_CREATED",
      entityType: "transfer",
      entityId: row._id,
      metadata: {
        amountMinor: row.amountMinor,
        fromMemberId: String(row.fromMemberId),
        toMemberId: String(row.toMemberId),
      },
    });

    if (parsed.data.clientMutationId) {
      await MutationLog.create(
        [
          {
            mutationId: parsed.data.clientMutationId,
            userId: auth.user.id,
            type: "transfer.create",
            entity: "transfer",
            entityId: String(row._id),
            status: "APPLIED",
            serverEntityId: String(row._id),
          },
        ],
        opts
      );
    }

    return row;
  });

  return created({ transfer: serializeTransfer(transfer) });
}

import { connectDb, withTransaction } from "@/lib/db";
import {
  Group,
  Income,
  MutationLog,
  Transfer,
} from "@/models";
import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildExpenseCreateData } from "@/lib/expenses/service";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { calculateSplit } from "@/shared/split/index.js";
import { z } from "zod";

const mutationSchema = z.object({
  mutationId: z.string().uuid(),
  type: z.string().min(1),
  entity: z.string().min(1),
  payload: z.record(z.string(), z.any()),
  clientTimestamp: z.string().datetime().optional(),
  baseVersion: z.number().int().optional(),
});

const syncSchema = z.object({
  deviceId: z.string().trim().max(128).optional(),
  mutations: z.array(mutationSchema).max(100),
});

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const results = [];

  for (const mutation of parsed.data.mutations) {
    const existing = await MutationLog.findOne({
      mutationId: mutation.mutationId,
    }).lean();

    if (existing) {
      results.push({
        mutationId: mutation.mutationId,
        status: "DUPLICATE",
        serverEntityId: existing.serverEntityId,
      });
      continue;
    }

    try {
      const applied = await applyMutation({
        mutation,
        user: auth.user,
        deviceId: parsed.data.deviceId,
      });
      results.push(applied);
    } catch (e) {
      const status = e.code === "CONFLICT" ? "CONFLICT" : "REJECTED";
      try {
        await MutationLog.create({
          mutationId: mutation.mutationId,
          userId: auth.user._id,
          deviceId: parsed.data.deviceId ?? null,
          type: mutation.type,
          entity: mutation.entity,
          status,
          conflictReason: e.message,
          clientTimestamp: mutation.clientTimestamp
            ? new Date(mutation.clientTimestamp)
            : null,
        });
      } catch {
        // ignore duplicate log races
      }

      results.push({
        mutationId: mutation.mutationId,
        status,
        error: e.message,
      });
    }
  }

  return ok({ results });
}

async function applyMutation({ mutation, user, deviceId }) {
  const { type, payload } = mutation;

  if (type === "expense.create") {
    const membership = await requireGroupPermission(user._id, payload.groupId, Actions.ADD_EXPENSE);
    const group = await Group.findById(membership.groupId).lean();
    if (!group) throw Object.assign(new Error("Group not found"), { status: 404 });
    const groupId = membership.groupId;

    const result = await withTransaction(async (session) => {
      const { expense, duplicate } = await buildExpenseCreateData({
        group,
        userId: user._id,
        input: { ...payload, clientMutationId: mutation.mutationId },
        session,
      });

      if (!duplicate) {
        await recordActivity({
          session,
          groupId,
          actorId: user._id,
          action: "EXPENSE_CREATED",
          entityType: "expense",
          entityId: expense._id,
          metadata: { title: expense.title, amountMinor: expense.amountMinor },
        });
      }

      const opts = session ? { session } : {};
      await MutationLog.updateOne(
        { mutationId: mutation.mutationId },
        {
          $setOnInsert: {
            mutationId: mutation.mutationId,
            userId: user._id,
            deviceId: deviceId ?? null,
            type,
            entity: "expense",
            entityId: expense._id,
            status: duplicate ? "DUPLICATE" : "APPLIED",
            serverEntityId: expense._id,
            clientTimestamp: mutation.clientTimestamp
              ? new Date(mutation.clientTimestamp)
              : null,
            processedAt: new Date(),
          },
        },
        { upsert: true, ...opts }
      );

      return { expense, duplicate };
    });

    return {
      mutationId: mutation.mutationId,
      status: result.duplicate ? "DUPLICATE" : "APPLIED",
      serverEntityId: result.expense._id,
      entity: result.expense,
    };
  }

  if (type === "transfer.create") {
    const membership = await requireGroupPermission(user._id, payload.groupId, Actions.ADD_TRANSFER);
    const group = await Group.findById(membership.groupId).lean();
    if (!group) throw Object.assign(new Error("Group not found"), { status: 404 });
    const groupId = membership.groupId;

    const transfer = await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      const existing = await Transfer.findOne({
        clientMutationId: mutation.mutationId,
      })
        .session(session || null)
        .lean();
      if (existing) return { row: existing, duplicate: true };

      const [row] = await Transfer.create(
        [
          {
            groupId,
            fromMemberId: payload.fromMemberId,
            toMemberId: payload.toMemberId,
            amountMinor: payload.amountMinor,
            currency: payload.currency || group.currency,
            title: payload.title ?? null,
            icon: payload.icon ?? null,
            note: payload.note ?? payload.title ?? null,
            createdById: user._id,
            clientMutationId: mutation.mutationId,
            transferDate: payload.transferDate
              ? new Date(payload.transferDate)
              : new Date(),
          },
        ],
        opts
      );

      await recordActivity({
        session,
        groupId,
        actorId: user._id,
        action: "TRANSFER_CREATED",
        entityType: "transfer",
        entityId: row._id,
        metadata: {
          title: row.title,
          amountMinor: row.amountMinor,
          fromMemberId: String(row.fromMemberId),
          toMemberId: String(row.toMemberId),
        },
      });

      await MutationLog.create(
        [
          {
            mutationId: mutation.mutationId,
            userId: user._id,
            deviceId: deviceId ?? null,
            type,
            entity: "transfer",
            entityId: String(row._id),
            status: "APPLIED",
            serverEntityId: String(row._id),
          },
        ],
        opts
      );

      return { row, duplicate: false };
    });

    return {
      mutationId: mutation.mutationId,
      status: transfer.duplicate ? "DUPLICATE" : "APPLIED",
      serverEntityId: String(transfer.row._id),
      entity: transfer.row,
    };
  }

  if (type === "income.create") {
    const membership = await requireGroupPermission(user._id, payload.groupId, Actions.ADD_INCOME);
    const group = await Group.findById(membership.groupId).lean();
    if (!group) throw Object.assign(new Error("Group not found"), { status: 404 });
    const groupId = membership.groupId;

    const splitResult = calculateSplit({
      method: payload.splitMethod || "EQUAL",
      totalMinor: payload.amountMinor,
      participants: (payload.receivers || []).map((r) => ({
        memberId: r.memberId,
        inputValue: r.inputValue ?? r.amountMinor,
      })),
    });
    if (!splitResult.valid) {
      throw Object.assign(new Error(splitResult.errors.join("; ")), {
        status: 422,
      });
    }

    const income = await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      const existing = await Income.findOne({
        clientMutationId: mutation.mutationId,
      })
        .session(session || null)
        .lean();
      if (existing) return { row: existing, duplicate: true };

      const [row] = await Income.create(
        [
          {
            groupId,
            title: payload.title,
            description: payload.description ?? null,
            amountMinor: payload.amountMinor,
            currency: payload.currency || group.currency,
            splitMethod: payload.splitMethod || "EQUAL",
            createdById: user._id,
            clientMutationId: mutation.mutationId,
            receivers: splitResult.splits.map((s) => ({
              memberId: s.memberId,
              amountMinor: s.amountMinor,
            })),
          },
        ],
        opts
      );

      await recordActivity({
        session,
        groupId,
        actorId: user._id,
        action: "INCOME_CREATED",
        entityType: "income",
        entityId: row._id,
        metadata: { title: row.title, amountMinor: row.amountMinor },
      });

      await MutationLog.create(
        [
          {
            mutationId: mutation.mutationId,
            userId: user._id,
            deviceId: deviceId ?? null,
            type,
            entity: "income",
            entityId: String(row._id),
            status: "APPLIED",
            serverEntityId: String(row._id),
          },
        ],
        opts
      );

      return { row, duplicate: false };
    });

    return {
      mutationId: mutation.mutationId,
      status: income.duplicate ? "DUPLICATE" : "APPLIED",
      serverEntityId: String(income.row._id),
      entity: income.row,
    };
  }

  throw Object.assign(new Error(`Unsupported mutation type: ${type}`), {
    status: 400,
  });
}

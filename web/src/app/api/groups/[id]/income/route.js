import { connectDb, toJSON, withTransaction } from "@/lib/db";
import { Group, Income, MutationLog } from "@/models";
import { created, fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { recordActivity } from "@/lib/activity";
import { requireGroupPermission } from "@/lib/permissions";
import { Actions } from "@/shared/permissions/index.js";
import { calculateSplit } from "@/shared/split/index.js";
import { createIncomeSchema } from "@/lib/validations/records";

function serializeIncome(doc) {
  const i = toJSON(doc);
  i.groupId = String(i.groupId);
  i.createdById = String(i.createdById);
  i.receivers = (i.receivers || []).map((r) => ({
    memberId: String(r.memberId),
    amountMinor: r.amountMinor,
  }));
  return i;
}

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.VIEW_EXPENSES);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  await connectDb();
  const incomes = await Income.find({ groupId, deletedAt: null })
    .sort({ incomeDate: -1, createdAt: -1 })
    .lean();
  return ok({ incomes: incomes.map(serializeIncome) });
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: code } = await params;
  let membership;
  try {
    membership = await requireGroupPermission(auth.user._id, code, Actions.ADD_INCOME);
  } catch (e) {
    return fail(e.message, e.status || 403, e.code || "FORBIDDEN");
  }
  const groupId = membership.groupId;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = createIncomeSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  await connectDb();
  const group = await Group.findById(groupId).lean();
  if (!group) return fail("Group not found", 404);

  if (parsed.data.clientMutationId) {
    const existing = await Income.findOne({
      clientMutationId: parsed.data.clientMutationId,
    }).lean();
    if (existing) return ok({ income: serializeIncome(existing), duplicate: true });
  }

  const splitResult = calculateSplit({
    method: parsed.data.splitMethod,
    totalMinor: parsed.data.amountMinor,
    participants: parsed.data.receivers.map((r) => ({
      memberId: r.memberId,
      inputValue: r.inputValue ?? r.amountMinor,
    })),
  });
  if (!splitResult.valid) {
    return fail(splitResult.errors.join("; "), 422, "VALIDATION_ERROR");
  }

  const income = await withTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [row] = await Income.create(
      [
        {
          groupId,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          amountMinor: parsed.data.amountMinor,
          currency: parsed.data.currency || group.currency,
          categoryKey: parsed.data.categoryId ?? null,
          icon: parsed.data.icon ?? null,
          splitMethod: parsed.data.splitMethod,
          createdById: auth.user._id,
          clientMutationId: parsed.data.clientMutationId ?? undefined,
          incomeDate: parsed.data.incomeDate
            ? new Date(parsed.data.incomeDate)
            : new Date(),
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
      actorId: auth.user._id,
      action: "INCOME_CREATED",
      entityType: "income",
      entityId: row._id,
      metadata: { title: row.title, amountMinor: row.amountMinor },
    });

    if (parsed.data.clientMutationId) {
      await MutationLog.create(
        [
          {
            mutationId: parsed.data.clientMutationId,
            userId: auth.user._id,
            type: "income.create",
            entity: "income",
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

  return created({ income: serializeIncome(income) });
}

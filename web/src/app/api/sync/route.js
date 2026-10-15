import { z } from "zod";

import { fail, ok, zodError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDb } from "@/lib/db";
import { OBJECT_ID, SyncError, applyChange, pullChanges, serverCopy } from "@/lib/sync";
import { MutationLog } from "@/models";

const objectId = z.string().regex(OBJECT_ID, "Expected a 24-char hex id");

const changeSchema = z.object({
  mutationId: z.string().min(8).max(64),
  entity: z.enum(["group", "expense", "transfer"]),
  op: z.enum(["upsert", "delete"]),
  id: objectId,
  groupId: objectId.optional(),
  clientUpdatedAt: z.string().datetime(),
  data: z.record(z.string(), z.any()).optional(),
});

const syncSchema = z.object({
  deviceId: z.string().trim().max(128).optional(),
  since: z.string().datetime().nullable().optional(),
  knownGroupIds: z.array(objectId).max(1000).default([]),
  changes: z.array(changeSchema).max(100).default([]),
});

/** Re-fetching a few seconds back is harmless (applies are idempotent) and covers clock jitter. */
const CURSOR_OVERLAP_MS = 5000;

function mergeInto(target, extra) {
  for (const key of ["groups", "expenses", "transfers"]) {
    for (const row of extra?.[key] || []) {
      if (!target[key].some((r) => r.id === row.id)) target[key].push(row);
    }
  }
}

/**
 * One round trip: apply the device's pending changes, then return everything that
 * changed on the server since its cursor.
 */
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
  const { deviceId, since, knownGroupIds, changes } = parsed.data;

  await connectDb();
  const user = auth.user;
  const results = [];
  const corrections = [];

  for (const change of changes) {
    const seen = await MutationLog.findOne({ mutationId: change.mutationId }).lean();
    if (seen) {
      results.push({ mutationId: change.mutationId, status: "DUPLICATE" });
      continue;
    }

    let status;
    let error = null;
    try {
      ({ status } = await applyChange({ change, user }));
    } catch (e) {
      status = "REJECTED";
      error = e instanceof SyncError ? e.message : "Could not apply change";
      if (!(e instanceof SyncError)) console.error("[sync] apply failed", e);
    }

    if (status !== "APPLIED") corrections.push(change);
    results.push({ mutationId: change.mutationId, status, ...(error ? { error } : {}) });

    await MutationLog.create({
      mutationId: change.mutationId,
      userId: user._id,
      deviceId: deviceId ?? null,
      type: `${change.entity}.${change.op}`,
      entity: change.entity,
      entityId: change.id,
      status: status === "STALE" ? "CONFLICT" : status,
      serverEntityId: change.id,
      conflictReason: error,
      clientTimestamp: new Date(change.clientUpdatedAt),
    }).catch(() => {});
  }

  const cursor = new Date(Date.now() - CURSOR_OVERLAP_MS).toISOString();
  const pulled = await pullChanges({ user, since, knownGroupIds });

  // A stale or rejected push must be overwritten on the device by the server copy,
  // even when that copy is older than the cursor.
  for (const change of corrections) {
    mergeInto(pulled, await serverCopy(change));
  }

  return ok({ results, ...pulled, cursor });
}

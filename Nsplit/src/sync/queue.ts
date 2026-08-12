import { getDb } from '../db/client';

export type QueueMutation = {
  mutationId: string;
  type: string;
  entity: string;
  payload: Record<string, unknown>;
  clientTimestamp?: string;
  baseVersion?: number;
};

export async function enqueueMutation(mutation: QueueMutation) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_queue
      (id, mutation_id, type, entity, payload, client_timestamp, base_version, retries, status, next_attempt_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?)`,
    [
      mutation.mutationId,
      mutation.mutationId,
      mutation.type,
      mutation.entity,
      JSON.stringify(mutation.payload),
      mutation.clientTimestamp || new Date().toISOString(),
      mutation.baseVersion ?? null,
      new Date().toISOString(),
    ]
  );
}

export async function listPendingMutations(limit = 50) {
  const db = await getDb();
  const now = new Date().toISOString();
  return db.getAllAsync<{
    mutation_id: string;
    type: string;
    entity: string;
    payload: string;
    client_timestamp: string;
    base_version: number | null;
    retries: number;
  }>(
    `SELECT mutation_id, type, entity, payload, client_timestamp, base_version, retries
     FROM sync_queue
     WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
     ORDER BY client_timestamp ASC
     LIMIT ?`,
    [now, limit]
  );
}

export async function markMutationSynced(mutationId: string) {
  const db = await getDb();
  await db.runAsync(`UPDATE sync_queue SET status = 'synced', last_error = NULL WHERE mutation_id = ?`, [
    mutationId,
  ]);
}

export async function markMutationFailed(
  mutationId: string,
  error: string,
  retries: number,
  nextAttemptAt: string
) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending', last_error = ?, retries = ?, next_attempt_at = ? WHERE mutation_id = ?`,
    [error, retries, nextAttemptAt, mutationId]
  );
}

export async function markMutationConflict(mutationId: string, reason: string) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'conflict', last_error = ? WHERE mutation_id = ?`,
    [reason, mutationId]
  );
}

/** Exponential backoff with jitter (mirrors shared/sync). */
export function backoffMs(retryCount: number, base = 1000, cap = 300000) {
  const exp = Math.min(cap, base * 2 ** Math.max(0, retryCount));
  return exp + Math.floor(Math.random() * 250);
}

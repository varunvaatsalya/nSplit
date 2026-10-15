import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from '@/src/db/ids';

import { localChanges } from './events';

export type OutboxEntity = 'group' | 'expense' | 'transfer';

/**
 * Queue a record for upload. Call inside the same transaction as the write, so a
 * record can never change without being queued. Sync reads the record's current
 * state at push time, so repeated edits collapse into one upload.
 */
export async function enqueue(
  db: SQLiteDatabase,
  entity: OutboxEntity,
  entityId: string,
  groupId: string | null
) {
  await db.runAsync(
    `INSERT INTO outbox (entity, entity_id, group_id, mutation_id, enqueued_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(entity, entity_id) DO UPDATE SET
       mutation_id = excluded.mutation_id,
       enqueued_at = excluded.enqueued_at,
       attempts = 0,
       last_error = NULL`,
    [entity, entityId, groupId, createId(), new Date().toISOString()]
  );
  localChanges.emit();
}

/** Queue every live record, e.g. after upgrading from a version without sync. */
export async function enqueueEverything(db: SQLiteDatabase) {
  const groups = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM groups WHERE deleted_at IS NULL`
  );
  for (const g of groups) await enqueue(db, 'group', g.id, g.id);

  const expenses = await db.getAllAsync<{ id: string; group_id: string }>(
    `SELECT e.id, e.group_id FROM expenses e
     JOIN groups g ON g.id = e.group_id
     WHERE e.deleted_at IS NULL AND g.deleted_at IS NULL`
  );
  for (const e of expenses) await enqueue(db, 'expense', e.id, e.group_id);

  const transfers = await db.getAllAsync<{ id: string; group_id: string }>(
    `SELECT t.id, t.group_id FROM transfers t
     JOIN groups g ON g.id = t.group_id
     WHERE t.deleted_at IS NULL AND g.deleted_at IS NULL`
  );
  for (const t of transfers) await enqueue(db, 'transfer', t.id, t.group_id);
}

export async function pendingCount(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM outbox`);
  return Number(row?.n || 0);
}

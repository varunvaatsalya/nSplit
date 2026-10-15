import type { SQLiteDatabase } from 'expo-sqlite';

import { createId, OBJECT_ID } from './ids';

type MemberRef = { memberId?: string | null };

/**
 * One-time rewrite of pre-sync UUIDs into ObjectId-format ids (groups, members,
 * expenses, transfers, and every member reference inside JSON), so local records
 * can be stored on the server under the same id.
 */
export async function migrateIdsToObjectIds(db: SQLiteDatabase) {
  const groups = await db.getAllAsync<{ id: string; my_member_id: string | null; settings_json: string | null }>(
    `SELECT id, my_member_id, settings_json FROM groups`
  );
  const members = await db.getAllAsync<{ id: string; group_id: string }>(
    `SELECT id, group_id FROM group_members`
  );
  const expenses = await db.getAllAsync<{ id: string; group_id: string; json: string | null }>(
    `SELECT id, group_id, json FROM expenses`
  );
  const transfers = await db.getAllAsync<{
    id: string;
    group_id: string;
    from_member_id: string;
    to_member_id: string;
  }>(`SELECT id, group_id, from_member_id, to_member_id FROM transfers`);

  const legacy = [...groups, ...members, ...expenses, ...transfers].some((row) => !OBJECT_ID.test(row.id));
  if (!legacy) return;

  const ids = new Map<string, string>();
  const map = (id: string | null | undefined) => {
    if (!id || OBJECT_ID.test(id)) return id ?? null;
    let next = ids.get(id);
    if (!next) {
      next = createId();
      ids.set(id, next);
    }
    return next;
  };
  const mapRows = <T extends MemberRef>(rows: T[] | undefined) =>
    Array.isArray(rows) ? rows.map((row) => ({ ...row, memberId: map(row.memberId) })) : rows;

  const remapJson = (raw: string | null, keys: string[]) => {
    if (!raw) return raw;
    try {
      const parsed = JSON.parse(raw);
      for (const key of keys) parsed[key] = mapRows(parsed[key]);
      return JSON.stringify(parsed);
    } catch {
      return raw;
    }
  };

  // Child rows reference parents by id, so foreign keys are off while ids move.
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
    try {
      for (const g of groups) {
        await db.runAsync(`UPDATE groups SET id = ?, my_member_id = ?, settings_json = ? WHERE id = ?`, [
          map(g.id),
          map(g.my_member_id),
          remapJson(g.settings_json, ['defaultSplitConfig']),
          g.id,
        ]);
      }
      for (const m of members) {
        await db.runAsync(`UPDATE group_members SET id = ?, group_id = ? WHERE id = ?`, [
          map(m.id),
          map(m.group_id),
          m.id,
        ]);
      }
      for (const e of expenses) {
        await db.runAsync(`UPDATE expenses SET id = ?, group_id = ?, json = ? WHERE id = ?`, [
          map(e.id),
          map(e.group_id),
          remapJson(e.json, ['payers', 'participants', 'splits']),
          e.id,
        ]);
      }
      for (const t of transfers) {
        await db.runAsync(
          `UPDATE transfers SET id = ?, group_id = ?, from_member_id = ?, to_member_id = ? WHERE id = ?`,
          [map(t.id), map(t.group_id), map(t.from_member_id), map(t.to_member_id), t.id]
        );
      }
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;').catch(() => {});
      throw error;
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}

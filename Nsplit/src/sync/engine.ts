import type { SQLiteDatabase } from 'expo-sqlite';

import { apiFetch } from '@/src/api/client';
import { getDb, runInTransaction } from '@/src/db/client';
import { createId } from '@/src/db/ids';

import { remoteChanges } from './events';
import type { OutboxEntity } from './outbox';

const BATCH = 100;
const MAX_ROUNDS = 10;

const META = {
  cursor: 'sync_cursor',
  owner: 'sync_owner_user_id',
  device: 'sync_device_id',
  lastSyncedAt: 'sync_last_synced_at',
  lastRejected: 'sync_last_rejected',
};

/* ------------------------------------------------------------------ wire types */

type Change = {
  mutationId: string;
  entity: OutboxEntity;
  op: 'upsert' | 'delete';
  id: string;
  groupId?: string;
  clientUpdatedAt: string;
  data?: Record<string, unknown>;
};

type Result = { mutationId: string; status: 'APPLIED' | 'DUPLICATE' | 'STALE' | 'REJECTED'; error?: string };

type MemberRow = { memberId: string; amountMinor?: number; included?: boolean; inputValue?: number | null };

type ServerGroup = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  currency: string;
  settings: unknown;
  members: {
    id: string;
    displayName: string;
    userId: string | null;
    email: string | null;
    permission: string;
    avatar: { letters: string | null; bg: string | null };
    upiId: string | null;
    leftAt: string | null;
  }[];
  clientUpdatedAt: string | null;
};

type ServerExpense = {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  amountMinor: number;
  currency: string;
  icon: string | null;
  categoryKey: string | null;
  splitMethod: string;
  expenseDate: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  createdById: string | null;
  version: number;
  payers: MemberRow[];
  participants: MemberRow[];
  splits: MemberRow[];
  clientUpdatedAt: string | null;
};

type ServerTransfer = {
  id: string;
  groupId: string;
  title: string | null;
  icon: string | null;
  amountMinor: number;
  currency: string;
  fromMemberId: string;
  toMemberId: string;
  transferDate: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  createdById: string | null;
  clientUpdatedAt: string | null;
};

type SyncResponse = {
  results: Result[];
  groups: ServerGroup[];
  expenses: ServerExpense[];
  transfers: ServerTransfer[];
  removedGroupIds: string[];
  cursor: string;
};

export class SyncHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------------ meta */

async function getMeta(db: SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [key]);
  return row?.value ?? null;
}

async function setMeta(db: SQLiteDatabase, key: string, value: string | null) {
  if (value == null) await db.runAsync(`DELETE FROM meta WHERE key = ?`, [key]);
  else await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [key, value]);
}

async function deviceId(db: SQLiteDatabase) {
  let id = await getMeta(db, META.device);
  if (!id) {
    id = createId();
    await setMeta(db, META.device, id);
  }
  return id;
}

/* ------------------------------------------------------------- build snapshots */

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type OutboxRow = { entity: OutboxEntity; entity_id: string; group_id: string | null; mutation_id: string };

/** Current state of a queued record, or null when it no longer exists locally. */
async function snapshot(db: SQLiteDatabase, row: OutboxRow): Promise<Change | null> {
  const base = { mutationId: row.mutation_id, entity: row.entity, id: row.entity_id };

  if (row.entity === 'group') {
    const g = await db.getFirstAsync<{
      code: string;
      name: string;
      icon: string | null;
      currency: string;
      my_member_id: string | null;
      settings_json: string | null;
      updated_at: string;
      deleted_at: string | null;
    }>(`SELECT code, name, icon, currency, my_member_id, settings_json, updated_at, deleted_at FROM groups WHERE id = ?`, [
      row.entity_id,
    ]);
    if (!g) return null;
    if (g.deleted_at) {
      return { ...base, op: 'delete', groupId: row.entity_id, clientUpdatedAt: g.deleted_at };
    }
    const members = await db.getAllAsync<{
      id: string;
      display_name: string;
      avatar_letters: string | null;
      avatar_bg: string | null;
      upi_id: string | null;
      left_at: string | null;
    }>(`SELECT id, display_name, avatar_letters, avatar_bg, upi_id, left_at FROM group_members WHERE group_id = ?`, [
      row.entity_id,
    ]);
    return {
      ...base,
      op: 'upsert',
      groupId: row.entity_id,
      clientUpdatedAt: g.updated_at,
      data: {
        code: g.code,
        name: g.name,
        icon: g.icon,
        currency: g.currency,
        settings: parseJson(g.settings_json, null),
        myMemberId: g.my_member_id,
        members: members.map((m) => ({
          id: m.id,
          displayName: m.display_name,
          avatar: { letters: m.avatar_letters, bg: m.avatar_bg },
          upiId: m.upi_id,
          leftAt: m.left_at,
        })),
      },
    };
  }

  if (row.entity === 'expense') {
    const e = await db.getFirstAsync<{
      group_id: string;
      title: string | null;
      amount_minor: number | null;
      icon: string | null;
      category_key: string | null;
      split_method: string | null;
      expense_date: string | null;
      updated_at: string | null;
      deleted_at: string | null;
      json: string | null;
    }>(`SELECT group_id, title, amount_minor, icon, category_key, split_method, expense_date, updated_at, deleted_at, json
        FROM expenses WHERE id = ?`, [row.entity_id]);
    if (!e) return null;
    const stamp = e.updated_at || new Date().toISOString();
    if (e.deleted_at) {
      return { ...base, op: 'delete', groupId: e.group_id, clientUpdatedAt: stamp, data: { deletedAt: e.deleted_at } };
    }
    const extra = parseJson<Record<string, unknown>>(e.json, {});
    return {
      ...base,
      op: 'upsert',
      groupId: e.group_id,
      clientUpdatedAt: stamp,
      data: {
        title: e.title,
        description: extra.description ?? null,
        amountMinor: Number(e.amount_minor || 0),
        icon: e.icon,
        categoryKey: e.category_key,
        splitMethod: e.split_method || 'EQUAL',
        expenseDate: e.expense_date,
        payers: extra.payers || [],
        participants: extra.participants || [],
        splits: extra.splits || [],
      },
    };
  }

  const t = await db.getFirstAsync<{
    group_id: string;
    title: string | null;
    icon: string | null;
    amount_minor: number | null;
    from_member_id: string;
    to_member_id: string;
    transfer_date: string | null;
    updated_at: string | null;
    deleted_at: string | null;
  }>(`SELECT group_id, title, icon, amount_minor, from_member_id, to_member_id, transfer_date, updated_at, deleted_at
      FROM transfers WHERE id = ?`, [row.entity_id]);
  if (!t) return null;
  const stamp = t.updated_at || new Date().toISOString();
  if (t.deleted_at) {
    return { ...base, op: 'delete', groupId: t.group_id, clientUpdatedAt: stamp, data: { deletedAt: t.deleted_at } };
  }
  return {
    ...base,
    op: 'upsert',
    groupId: t.group_id,
    clientUpdatedAt: stamp,
    data: {
      title: t.title,
      icon: t.icon,
      amountMinor: Number(t.amount_minor || 0),
      fromMemberId: t.from_member_id,
      toMemberId: t.to_member_id,
      transferDate: t.transfer_date,
    },
  };
}

/* --------------------------------------------------------------- apply pulled */

/** Remove a group and everything in it from this device. */
async function purgeGroup(db: SQLiteDatabase, groupId: string) {
  await db.runAsync(`DELETE FROM expenses WHERE group_id = ?`, [groupId]);
  await db.runAsync(`DELETE FROM transfers WHERE group_id = ?`, [groupId]);
  await db.runAsync(`DELETE FROM group_members WHERE group_id = ?`, [groupId]);
  await db.runAsync(`DELETE FROM outbox WHERE group_id = ?`, [groupId]);
  await db.runAsync(`DELETE FROM groups WHERE id = ?`, [groupId]);
}

async function applyGroup(db: SQLiteDatabase, g: ServerGroup, userId: string) {
  const stamp = g.clientUpdatedAt || new Date().toISOString();
  // Codes are unique locally too; never let a stale local row block the server's code.
  await db.runAsync(`UPDATE groups SET code = code || '-' || substr(id, 1, 4) WHERE code = ? AND id != ?`, [g.code, g.id]);
  await db.runAsync(
    `INSERT INTO groups (id, code, name, icon, currency, settings_json, created_at, updated_at, deleted_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       code = excluded.code, name = excluded.name, icon = excluded.icon, currency = excluded.currency,
       settings_json = excluded.settings_json, updated_at = excluded.updated_at, deleted_at = NULL, synced = 1`,
    [g.id, g.code, g.name, g.icon, g.currency || 'INR', JSON.stringify(g.settings ?? null), stamp, stamp]
  );
  for (const m of g.members) {
    await db.runAsync(
      `INSERT INTO group_members
        (id, group_id, display_name, user_id, email, permission, avatar_letters, avatar_bg, upi_id, created_at, left_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name, user_id = excluded.user_id, email = excluded.email,
         permission = excluded.permission, avatar_letters = excluded.avatar_letters,
         avatar_bg = excluded.avatar_bg, upi_id = excluded.upi_id, left_at = excluded.left_at`,
      [m.id, g.id, m.displayName, m.userId, m.email, m.permission || 'ADD', m.avatar?.letters ?? null,
        m.avatar?.bg ?? null, m.upiId ?? null, stamp, m.leftAt]
    );
  }
  // On a new device, "me" is the member linked to this account.
  const mine = g.members.find((m) => m.userId === userId && !m.leftAt);
  if (mine) {
    await db.runAsync(`UPDATE groups SET my_member_id = ? WHERE id = ? AND my_member_id IS NULL`, [mine.id, g.id]);
  }
}

async function applyExpense(db: SQLiteDatabase, e: ServerExpense) {
  const stamp = e.clientUpdatedAt || new Date().toISOString();
  const json = JSON.stringify({
    description: e.description,
    currency: e.currency,
    splitMethod: e.splitMethod,
    createdById: e.createdById,
    version: e.version,
    payers: e.payers,
    participants: e.participants,
    splits: e.splits,
  });
  await db.runAsync(
    `INSERT INTO expenses
      (id, group_id, title, amount_minor, currency, icon, category_key, split_method, expense_date,
       created_at, updated_at, deleted_at, json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, amount_minor = excluded.amount_minor, currency = excluded.currency,
       icon = excluded.icon, category_key = excluded.category_key, split_method = excluded.split_method,
       expense_date = excluded.expense_date, updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at, json = excluded.json`,
    [e.id, e.groupId, e.title, e.amountMinor, e.currency, e.icon, e.categoryKey, e.splitMethod,
      e.expenseDate, e.createdAt || stamp, stamp, e.deletedAt, json]
  );
}

async function applyTransfer(db: SQLiteDatabase, t: ServerTransfer) {
  const stamp = t.clientUpdatedAt || new Date().toISOString();
  await db.runAsync(
    `INSERT INTO transfers
      (id, group_id, title, amount_minor, currency, icon, from_member_id, to_member_id, transfer_date,
       created_at, updated_at, deleted_at, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, amount_minor = excluded.amount_minor, currency = excluded.currency,
       icon = excluded.icon, from_member_id = excluded.from_member_id, to_member_id = excluded.to_member_id,
       transfer_date = excluded.transfer_date, updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at, created_by_id = excluded.created_by_id`,
    [t.id, t.groupId, t.title, t.amountMinor, t.currency, t.icon, t.fromMemberId, t.toMemberId,
      t.transferDate, t.createdAt || stamp, stamp, t.deletedAt, t.createdById]
  );
}

/**
 * Write server data locally. A record with a still-pending local change is skipped:
 * that change is newer and will be pushed (and, if rejected, corrected next round).
 */
async function applyPull(db: SQLiteDatabase, res: SyncResponse, userId: string) {
  const pending = new Set(
    (await db.getAllAsync<{ entity: string; entity_id: string }>(`SELECT entity, entity_id FROM outbox`)).map(
      (r) => `${r.entity}:${r.entity_id}`
    )
  );
  let changed = false;

  for (const id of res.removedGroupIds || []) {
    if (pending.has(`group:${id}`)) continue;
    await purgeGroup(db, id);
    changed = true;
  }
  for (const g of res.groups || []) {
    if (pending.has(`group:${g.id}`)) continue;
    await applyGroup(db, g, userId);
    changed = true;
  }

  const localGroups = new Set(
    (await db.getAllAsync<{ id: string }>(`SELECT id FROM groups`)).map((r) => r.id)
  );
  for (const e of res.expenses || []) {
    if (pending.has(`expense:${e.id}`) || !localGroups.has(e.groupId)) continue;
    await applyExpense(db, e);
    changed = true;
  }
  for (const t of res.transfers || []) {
    if (pending.has(`transfer:${t.id}`) || !localGroups.has(t.groupId)) continue;
    await applyTransfer(db, t);
    changed = true;
  }
  return changed;
}

/* ------------------------------------------------------------------- run sync */

export type SyncOutcome = { rejected: number; lastRejectedError: string | null };

/**
 * Push queued changes and pull server changes until the outbox is drained.
 * Throws SyncHttpError when the server is unreachable or refuses the session.
 */
export async function runSync(userId: string): Promise<SyncOutcome> {
  const db = await getDb();
  const device = await deviceId(db);
  let rejected = 0;
  let lastRejectedError: string | null = null;
  let anyChange = false;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const rows = await db.getAllAsync<OutboxRow>(
      `SELECT entity, entity_id, group_id, mutation_id FROM outbox
       ORDER BY CASE entity WHEN 'group' THEN 0 ELSE 1 END, enqueued_at
       LIMIT ${BATCH}`
    );

    const changes: Change[] = [];
    for (const row of rows) {
      const change = await snapshot(db, row);
      if (change) changes.push(change);
      else {
        await db.runAsync(`DELETE FROM outbox WHERE entity = ? AND entity_id = ? AND mutation_id = ?`, [
          row.entity,
          row.entity_id,
          row.mutation_id,
        ]);
      }
    }

    const known = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM groups WHERE synced = 1 AND deleted_at IS NULL`
    );
    const res = await apiFetch<SyncResponse>('/api/sync', {
      method: 'POST',
      timeoutMs: 30000,
      body: JSON.stringify({
        deviceId: device,
        since: await getMeta(db, META.cursor),
        knownGroupIds: known.map((g) => g.id),
        changes,
      }),
    });
    if (!res.ok || !res.data) {
      throw new SyncHttpError(res.error?.message || 'Sync failed', res.status);
    }
    const data = res.data;

    const changed = await runInTransaction(db, async () => {
      const byMutation = new Map(changes.map((c) => [c.mutationId, c]));
      for (const result of data.results || []) {
        const change = byMutation.get(result.mutationId);
        if (!change) continue;
        // Only clear the row if it was not edited again while this request was in flight.
        await db.runAsync(`DELETE FROM outbox WHERE entity = ? AND entity_id = ? AND mutation_id = ?`, [
          change.entity,
          change.id,
          change.mutationId,
        ]);
        const ok = result.status === 'APPLIED' || result.status === 'DUPLICATE';
        if (ok && change.entity === 'group') {
          if (change.op === 'delete') await purgeGroup(db, change.id);
          else await db.runAsync(`UPDATE groups SET synced = 1 WHERE id = ?`, [change.id]);
        }
        if (result.status === 'REJECTED') {
          rejected += 1;
          lastRejectedError = result.error || 'Change was rejected by the server';
        }
      }
      const applied = await applyPull(db, data, userId);
      await setMeta(db, META.cursor, data.cursor);
      await setMeta(db, META.lastSyncedAt, new Date().toISOString());
      return applied;
    });
    anyChange = anyChange || changed;

    if (rows.length < BATCH) break;
  }

  if (rejected) {
    const db2 = await getDb();
    await setMeta(db2, META.lastRejected, JSON.stringify({ count: rejected, error: lastRejectedError }));
  }
  if (anyChange) remoteChanges.emit();
  return { rejected, lastRejectedError };
}

export async function getLastSyncedAt() {
  return getMeta(await getDb(), META.lastSyncedAt);
}

/** Delete every group, record and sync marker on this device (on logout). */
export async function wipeLocalData() {
  const db = await getDb();
  await runInTransaction(db, async () => {
    await db.runAsync(`DELETE FROM outbox`);
    await db.runAsync(`DELETE FROM expenses`);
    await db.runAsync(`DELETE FROM transfers`);
    await db.runAsync(`DELETE FROM group_members`);
    await db.runAsync(`DELETE FROM groups`);
    for (const key of [META.cursor, META.owner, META.lastSyncedAt, META.lastRejected]) {
      await setMeta(db, key, null);
    }
  });
  remoteChanges.emit();
}

/**
 * Tie local data to the signed-in account. Data left by a different account is
 * wiped (it belongs to someone else); data created while signed out is kept and
 * uploads to this account.
 */
export async function claimLocalData(userId: string) {
  const db = await getDb();
  const owner = await getMeta(db, META.owner);
  if (owner && owner !== userId) await wipeLocalData();
  await setMeta(db, META.owner, userId);
}

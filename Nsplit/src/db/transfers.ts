import type { Transfer } from '@/src/api/types';
import { getDb, runInTransaction } from './client';
import { getGroup } from './groups';
import { createId } from './ids';

type TransferRow = {
  id: string;
  group_id: string;
  title: string | null;
  amount_minor: number | null;
  currency: string | null;
  icon: string | null;
  from_member_id: string;
  to_member_id: string;
  transfer_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_id: string | null;
};

export type TransferWriteInput = {
  title: string;
  icon?: string | null;
  amountMinor: number;
  fromMemberId: string;
  toMemberId: string;
  transferDate?: string;
  createdById?: string | null;
};

function mapTransfer(row: TransferRow): Transfer {
  return {
    _id: row.id,
    title: row.title || '',
    amountMinor: Number(row.amount_minor || 0),
    currency: row.currency || 'INR',
    icon: row.icon,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    transferDate: row.transfer_date || undefined,
    createdAt: row.created_at || undefined,
    createdById: row.created_by_id || undefined,
  };
}

export async function listTransfers(groupId: string): Promise<Transfer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TransferRow>(
    `SELECT id, group_id, title, amount_minor, currency, icon, from_member_id, to_member_id,
            transfer_date, created_at, updated_at, created_by_id
     FROM transfers
     WHERE group_id = ? AND deleted_at IS NULL
     ORDER BY transfer_date DESC, created_at DESC`,
    [groupId]
  );
  return rows.map(mapTransfer);
}

export async function getTransfer(groupId: string, transferId: string): Promise<Transfer | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TransferRow>(
    `SELECT id, group_id, title, amount_minor, currency, icon, from_member_id, to_member_id,
            transfer_date, created_at, updated_at, created_by_id
     FROM transfers
     WHERE group_id = ? AND id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [groupId, transferId]
  );
  return row ? mapTransfer(row) : null;
}

export async function saveTransfer(
  groupId: string,
  input: TransferWriteInput,
  transferId?: string | null
): Promise<Transfer> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (!input.fromMemberId || !input.toMemberId) throw new Error('Invalid transfer members');
  if (input.fromMemberId === input.toMemberId) throw new Error('From and to must differ');
  if (!input.amountMinor || input.amountMinor < 1) throw new Error('Amount required');

  const existing = transferId ? await getTransfer(group._id, transferId) : null;
  if (transferId && !existing) throw new Error('Transfer not found');

  const now = new Date().toISOString();
  const transfer: Transfer = {
    _id: existing?._id || createId(),
    title: input.title.trim(),
    icon: input.icon || '💸',
    amountMinor: input.amountMinor,
    currency: existing?.currency || group.currency || 'INR',
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    transferDate: input.transferDate || existing?.transferDate || now,
    createdAt: existing?.createdAt || now,
    createdById: existing?.createdById || input.createdById || undefined,
  };

  const db = await getDb();
  await runInTransaction(db, async () => {
    if (existing) {
      await db.runAsync(
        `UPDATE transfers
         SET title = ?, amount_minor = ?, currency = ?, icon = ?, from_member_id = ?,
             to_member_id = ?, transfer_date = ?, updated_at = ?
         WHERE id = ? AND group_id = ?`,
        [
          transfer.title,
          transfer.amountMinor,
          transfer.currency || 'INR',
          transfer.icon || null,
          transfer.fromMemberId,
          transfer.toMemberId,
          transfer.transferDate || now,
          now,
          transfer._id,
          group._id,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO transfers
          (id, group_id, title, amount_minor, currency, icon, from_member_id, to_member_id,
           transfer_date, created_at, updated_at, created_by_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transfer._id,
          group._id,
          transfer.title,
          transfer.amountMinor,
          transfer.currency || 'INR',
          transfer.icon || null,
          transfer.fromMemberId,
          transfer.toMemberId,
          transfer.transferDate || now,
          transfer.createdAt || now,
          now,
          transfer.createdById || null,
        ]
      );
    }
    await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [now, group._id]);
  });

  return transfer;
}

export async function deleteTransfer(groupId: string, transferId: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await runInTransaction(db, async () => {
    await db.runAsync(
      `UPDATE transfers SET deleted_at = ?, updated_at = ? WHERE id = ? AND group_id = ? AND deleted_at IS NULL`,
      [now, now, transferId, groupId]
    );
    await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [now, groupId]);
  });
}

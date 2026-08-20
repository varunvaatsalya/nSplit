import type { Transfer } from '@/src/api/types';
import { getDb } from './client';
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

export async function saveTransfer(groupId: string, input: TransferWriteInput): Promise<Transfer> {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  if (!input.fromMemberId || !input.toMemberId) throw new Error('Invalid transfer members');
  if (input.fromMemberId === input.toMemberId) throw new Error('From and to must differ');
  if (!input.amountMinor || input.amountMinor < 1) throw new Error('Amount required');

  const now = new Date().toISOString();
  const transfer: Transfer = {
    _id: createId(),
    title: input.title.trim(),
    icon: input.icon || '💸',
    amountMinor: input.amountMinor,
    currency: group.currency || 'INR',
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    transferDate: input.transferDate || now,
    createdAt: now,
    createdById: input.createdById || undefined,
  };

  const db = await getDb();
  await db.withTransactionAsync(async () => {
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
        now,
        now,
        transfer.createdById || null,
      ]
    );
    await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [now, group._id]);
  });

  return transfer;
}

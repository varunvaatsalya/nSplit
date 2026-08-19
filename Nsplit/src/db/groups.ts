import type { GroupDetail, GroupMember, GroupSummary, User } from '@/src/api/types';
import { allocateMemberAvatar } from '@/src/lib/avatar';
import { compareMembersByName } from '@/src/lib/members';

import { getDb } from './client';
import { createGroupCode, createId } from './ids';

type GroupRow = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  currency: string;
  member_count?: number | null;
};

type MemberRow = {
  id: string;
  group_id: string;
  display_name: string;
  user_id: string | null;
  email: string | null;
  permission: string;
  avatar_letters: string | null;
  avatar_bg: string | null;
};

export type CreateGroupInput = {
  name: string;
  icon?: string | null;
  currency?: string;
  members: { name: string }[];
  creator?: Pick<User, '_id' | 'name' | 'email'> | null;
};

function mapMember(row: MemberRow): GroupMember {
  return {
    _id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    permission: row.permission,
    avatar: {
      url: null,
      letters: row.avatar_letters,
      bg: row.avatar_bg,
    },
  };
}

function mapSummary(row: GroupRow): GroupSummary {
  return {
    _id: row.id,
    code: row.code,
    name: row.name,
    icon: row.icon,
    currency: row.currency,
    memberCount: Number(row.member_count || 0),
  };
}

async function uniqueGroupCode() {
  const db = await getDb();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createGroupCode();
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM groups WHERE code = ? LIMIT 1',
      [code]
    );
    if (!existing) return code;
  }
  return createGroupCode();
}

export async function listGroups(): Promise<GroupSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GroupRow>(
    `SELECT g.id, g.code, g.name, g.icon, g.currency,
            (SELECT COUNT(*) FROM group_members m
             WHERE m.group_id = g.id AND m.left_at IS NULL) AS member_count
     FROM groups g
     WHERE g.deleted_at IS NULL
     ORDER BY g.updated_at DESC`
  );
  return rows.map(mapSummary);
}

export async function getGroup(idOrCode: string): Promise<GroupDetail | null> {
  const db = await getDb();
  const group = await db.getFirstAsync<GroupRow>(
    `SELECT id, code, name, icon, currency
     FROM groups
     WHERE deleted_at IS NULL AND (id = ? OR code = ?)
     LIMIT 1`,
    [idOrCode, idOrCode]
  );
  if (!group) return null;

  const memberRows = await db.getAllAsync<MemberRow>(
    `SELECT id, group_id, display_name, user_id, email, permission, avatar_letters, avatar_bg
     FROM group_members
     WHERE group_id = ? AND left_at IS NULL`,
    [group.id]
  );
  const members = memberRows.map(mapMember).sort(compareMembersByName);
  const mine = members.find((m) => m.userId) || null;

  return {
    ...mapSummary({ ...group, member_count: members.length }),
    members,
    myPermission: mine?.permission || null,
    myMembershipId: mine?._id || members[0]?._id || null,
  };
}

export async function createGroup(input: CreateGroupInput): Promise<GroupDetail> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = createId();
  const code = await uniqueGroupCode();
  const currency = input.currency || 'INR';
  const icon = input.icon || '👥';
  const used = { letters: [] as string[], bgs: [] as string[] };

  type MemberInsert = {
    id: string;
    displayName: string;
    userId: string | null;
    email: string | null;
    permission: string;
    avatar: { letters: string; bg: string };
  };

  const members: MemberInsert[] = [];
  const creatorId = input.creator?._id || null;
  const creatorName = input.creator?.name?.trim();

  if (creatorId && creatorName) {
    const avatar = allocateMemberAvatar(creatorName, used);
    members.push({
      id: createId(),
      displayName: creatorName,
      userId: creatorId,
      email: input.creator?.email || null,
      permission: 'ADMIN',
      avatar: { letters: avatar.letters, bg: avatar.bg },
    });
  }

  for (const member of input.members) {
    const name = member.name.trim();
    if (!name) continue;
    if (
      creatorName &&
      name.toLowerCase() === creatorName.toLowerCase()
    ) {
      continue;
    }
    const avatar = allocateMemberAvatar(name, used);
    members.push({
      id: createId(),
      displayName: name,
      userId: null,
      email: null,
      permission: 'ADD',
      avatar: { letters: avatar.letters, bg: avatar.bg },
    });
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO groups (id, code, name, icon, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, code, input.name.trim(), icon, currency, now, now]
    );

    for (const member of members) {
      await db.runAsync(
        `INSERT INTO group_members
          (id, group_id, display_name, user_id, email, permission, avatar_letters, avatar_bg, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          member.id,
          id,
          member.displayName,
          member.userId,
          member.email,
          member.permission,
          member.avatar.letters,
          member.avatar.bg,
          now,
        ]
      );
    }
  });

  const created = await getGroup(id);
  if (!created) throw new Error('Failed to create group');
  return created;
}

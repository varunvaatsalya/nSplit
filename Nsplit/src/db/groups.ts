import type { GroupDetail, GroupMember, GroupSummary, User } from '@/src/api/types';
import { allocateMemberAvatar } from '@/src/lib/avatar';
import { normalizeSplitMethod } from '@/src/lib/expense-form-utils';
import { compareMembersByName, resolveMyMember } from '@/src/lib/members';

import { getDb } from './client';
import { createGroupCode, createId } from './ids';

type GroupRow = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  currency: string;
  my_member_id?: string | null;
  settings_json?: string | null;
  member_count?: number | null;
};

export type GroupSettings = NonNullable<GroupDetail['settings']>;

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
  myName?: string | null;
  matchByName?: boolean;
};

function emptySettings(): GroupSettings {
  return { defaultSplitMethod: 'EQUAL', defaultSplitConfig: null };
}

function parseSettings(raw?: string | null): GroupSettings {
  if (!raw) return emptySettings();
  try {
    const parsed = JSON.parse(raw) as GroupSettings;
    return {
      defaultSplitMethod: normalizeSplitMethod(parsed?.defaultSplitMethod),
      defaultSplitConfig: Array.isArray(parsed?.defaultSplitConfig)
        ? parsed.defaultSplitConfig
            .filter((row) => row?.memberId)
            .map((row) => ({
              memberId: String(row.memberId),
              value: Number.isFinite(Number(row.value))
                ? Math.max(1, Math.round(Number(row.value)))
                : 1,
            }))
        : null,
      simplifyDebts: Boolean(parsed?.simplifyDebts),
    };
  } catch {
    return emptySettings();
  }
}

function serializeSettings(settings: GroupSettings) {
  return JSON.stringify({
    defaultSplitMethod: normalizeSplitMethod(settings.defaultSplitMethod),
    defaultSplitConfig: settings.defaultSplitConfig ?? null,
    simplifyDebts: Boolean(settings.simplifyDebts),
  });
}

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
    myMembershipId: row.my_member_id || null,
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
    `SELECT g.id, g.code, g.name, g.icon, g.currency, g.my_member_id,
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
    `SELECT id, code, name, icon, currency, my_member_id, settings_json
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
  const mine =
    members.find((m) => m._id && group.my_member_id && m._id === group.my_member_id) ||
    members.find((m) => m.userId) ||
    null;

  return {
    ...mapSummary({ ...group, member_count: members.length }),
    members,
    myPermission: mine?.permission || null,
    myMembershipId: group.my_member_id || mine?._id || null,
    settings: parseSettings(group.settings_json),
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

  const mine = resolveMyMember(
    members.map((m) => ({
      _id: m.id,
      userId: m.userId,
      displayName: m.displayName,
    })),
    {
      userId: creatorId,
      myName: input.myName || input.creator?.name,
      matchByName: input.matchByName !== false,
    }
  );
  const myMemberId = mine?._id || null;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO groups (id, code, name, icon, currency, my_member_id, settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, input.name.trim(), icon, currency, myMemberId, serializeSettings(emptySettings()), now, now]
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

export async function setGroupMyMember(groupId: string, memberId: string | null) {
  const db = await getDb();
  await db.runAsync(`UPDATE groups SET my_member_id = ?, updated_at = ? WHERE id = ?`, [
    memberId,
    new Date().toISOString(),
    groupId,
  ]);
}

export async function updateGroup(
  groupId: string,
  input: { name?: string; icon?: string | null; currency?: string }
) {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  const db = await getDb();
  await db.runAsync(
    `UPDATE groups SET name = ?, icon = ?, currency = ?, updated_at = ? WHERE id = ?`,
    [
      (input.name ?? group.name).trim(),
      input.icon ?? group.icon ?? null,
      input.currency ?? group.currency ?? 'INR',
      new Date().toISOString(),
      group._id,
    ]
  );
}

export async function updateGroupSettings(groupId: string, patch: Partial<GroupSettings>) {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  const next: GroupSettings = {
    ...emptySettings(),
    ...group.settings,
    ...patch,
  };
  if (next.defaultSplitMethod !== 'SHARES') next.defaultSplitConfig = null;
  const db = await getDb();
  await db.runAsync(`UPDATE groups SET settings_json = ?, updated_at = ? WHERE id = ?`, [
    serializeSettings(next),
    new Date().toISOString(),
    group._id,
  ]);
}

export async function addGroupMember(groupId: string, name: string) {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  const displayName = name.trim();
  if (!displayName) throw new Error('Name required');

  const used = { letters: [] as string[], bgs: [] as string[] };
  for (const member of group.members || []) {
    if (member.avatar?.letters) used.letters.push(member.avatar.letters);
    if (member.avatar?.bg) used.bgs.push(member.avatar.bg);
  }
  const avatar = allocateMemberAvatar(displayName, used);
  const now = new Date().toISOString();
  const id = createId();
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO group_members
        (id, group_id, display_name, user_id, email, permission, avatar_letters, avatar_bg, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, group._id, displayName, null, null, 'ADD', avatar.letters, avatar.bg, now]
    );
    const settings = group.settings || emptySettings();
    if (settings.defaultSplitMethod === 'SHARES') {
      const config = [...(settings.defaultSplitConfig || [])];
      if (!config.some((row) => row.memberId === id)) {
        config.push({ memberId: id, value: 1 });
        await db.runAsync(`UPDATE groups SET settings_json = ?, updated_at = ? WHERE id = ?`, [
          serializeSettings({ ...settings, defaultSplitConfig: config }),
          now,
          group._id,
        ]);
      }
    } else {
      await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [now, group._id]);
    }
  });
}

export async function renameGroupMember(groupId: string, memberId: string, name: string) {
  const displayName = name.trim();
  if (!displayName) throw new Error('Name required');
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  const member = (group.members || []).find((m) => m._id === memberId);
  if (!member) throw new Error('Member not found');

  const db = await getDb();
  await db.runAsync(
    `UPDATE group_members SET display_name = ? WHERE id = ? AND group_id = ?`,
    [displayName, memberId, group._id]
  );
  await db.runAsync(`UPDATE groups SET updated_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    group._id,
  ]);
}

export async function removeGroupMember(groupId: string, memberId: string) {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  const members = group.members || [];
  if (members.length <= 1) throw new Error('A group needs at least one member');
  const member = members.find((m) => m._id === memberId);
  if (!member) throw new Error('Member not found');

  const now = new Date().toISOString();
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE group_members SET left_at = ? WHERE id = ? AND group_id = ?`,
      [now, memberId, group._id]
    );
    if (group.myMembershipId === memberId) {
      await db.runAsync(`UPDATE groups SET my_member_id = NULL WHERE id = ?`, [group._id]);
    }
    const settings = group.settings || emptySettings();
    const config = (settings.defaultSplitConfig || []).filter((row) => row.memberId !== memberId);
    await db.runAsync(`UPDATE groups SET settings_json = ?, updated_at = ? WHERE id = ?`, [
      serializeSettings({ ...settings, defaultSplitConfig: config.length ? config : null }),
      now,
      group._id,
    ]);
  });
}

export async function deleteGroup(groupId: string) {
  const db = await getDb();
  await db.runAsync(`UPDATE groups SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    new Date().toISOString(),
    groupId,
  ]);
}


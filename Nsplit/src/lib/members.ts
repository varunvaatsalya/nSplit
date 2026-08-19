import type { GroupMember } from '@/src/api/types';
import { findBestNameMatch } from '@/src/lib/name-match';

export function memberSortKey(member?: {
  displayName?: string | null;
  user?: { name?: string | null } | null;
  name?: string | null;
} | null) {
  return String(member?.displayName || member?.user?.name || member?.name || '').trim();
}

export function memberDisplayName(member?: Parameters<typeof memberSortKey>[0]) {
  return memberSortKey(member) || 'Member';
}

export function isSelfMember(
  member?: { _id?: string | null; userId?: string | null } | null,
  currentUserId?: string | null,
  myMemberId?: string | null
) {
  if (!member) return false;
  if (myMemberId && member._id && String(member._id) === String(myMemberId)) return true;
  if (!currentUserId) return false;
  return member.userId != null && String(member.userId) === String(currentUserId);
}

export function memberListLabel(
  member?: Parameters<typeof memberSortKey>[0] & { _id?: string | null; userId?: string | null },
  currentUserId?: string | null,
  myMemberId?: string | null
) {
  const name = memberDisplayName(member);
  return isSelfMember(member, currentUserId, myMemberId) ? `${name} (me)` : name;
}

export function resolveMyMember(
  members: GroupMember[] | undefined | null,
  opts: {
    userId?: string | null;
    myName?: string | null;
    matchByName?: boolean;
    myMemberId?: string | null;
  } = {}
): GroupMember | null {
  const list = Array.isArray(members) ? members : [];
  if (!list.length) return null;

  if (opts.userId) {
    const byUser = list.find(
      (m) => m.userId && String(m.userId) === String(opts.userId)
    );
    if (byUser) return byUser;
  }

  if (opts.myMemberId) {
    const pinned = list.find((m) => String(m._id) === String(opts.myMemberId));
    if (pinned) return pinned;
  }

  if (opts.matchByName === false) return null;
  return findBestNameMatch(list, opts.myName, (m) => memberDisplayName(m));
}

export function compareMembersByName(a: Parameters<typeof memberSortKey>[0], b: Parameters<typeof memberSortKey>[0]) {
  const an = memberSortKey(a);
  const bn = memberSortKey(b);
  if (!an && !bn) return 0;
  if (!an) return 1;
  if (!bn) return -1;
  return an.localeCompare(bn, undefined, { sensitivity: 'base', numeric: true });
}

export function sortMembersByName<T>(members: T[] | undefined | null): T[] {
  if (!Array.isArray(members)) return [];
  return [...members].sort((a, b) =>
    compareMembersByName(a as Parameters<typeof memberSortKey>[0], b as Parameters<typeof memberSortKey>[0])
  );
}

export function canMutateCreatedRecord(
  permission?: string | null,
  createdById?: string | null,
  userId?: string | null
) {
  if (permission === 'ADMIN') return true;
  if (permission !== 'ADD' && permission !== 'EDIT' && permission !== 'ADMIN') return false;
  if (createdById == null || userId == null) return false;
  return String(createdById) === String(userId);
}

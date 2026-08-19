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
  member?: { userId?: string | null } | null,
  currentUserId?: string | null
) {
  if (!member || currentUserId == null || currentUserId === '') return false;
  return member.userId != null && String(member.userId) === String(currentUserId);
}

export function memberListLabel(
  member?: Parameters<typeof memberSortKey>[0] & { userId?: string | null },
  currentUserId?: string | null
) {
  const name = memberDisplayName(member);
  return isSelfMember(member, currentUserId) ? `${name} (me)` : name;
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

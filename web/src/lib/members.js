/** Display name used for member ordering. */
export function memberSortKey(member) {
  return String(
    member?.displayName || member?.user?.name || member?.name || ""
  ).trim();
}

export function memberDisplayName(member) {
  return memberSortKey(member) || "Member";
}

export function isSelfMember(member, currentUserId) {
  if (!member || currentUserId == null || currentUserId === "") return false;
  return (
    member.userId != null && String(member.userId) === String(currentUserId)
  );
}

/** Name as shown in member lists. Viewer gets a "(me)" suffix. */
export function memberListLabel(member, currentUserId) {
  const name = memberDisplayName(member);
  return isSelfMember(member, currentUserId) ? `${name} (me)` : name;
}

export function compareMembersByName(a, b) {
  const an = memberSortKey(a);
  const bn = memberSortKey(b);
  if (!an && !bn) return 0;
  if (!an) return 1;
  if (!bn) return -1;
  return an.localeCompare(bn, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

/** Copy + sort. Safe for API payloads and React lists. */
export function sortMembersByName(members) {
  if (!Array.isArray(members)) return [];
  return [...members].sort(compareMembersByName);
}

/** Sort a group's members array in place (Mongo write path). */
export function sortGroupMembersInPlace(group) {
  if (!group?.members || typeof group.members.sort !== "function") return group;
  group.members.sort(compareMembersByName);
  if (typeof group.markModified === "function") {
    group.markModified("members");
  }
  return group;
}
